import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { BackgroundFitCalculationProgress, BackgroundFitView } from './background-fit'
import {
  createBackgroundFitWorkerClient,
  type BackgroundFitWorkerClient,
} from './background-fit-worker-client'
import type { LegendsBackgroundFitPerkRecord } from '../types/legends-perks'

const backgroundFitCompletionProgressMinimumDurationMs = 700
const backgroundFitProgressCountMinimumStepDurationMs = 10
const backgroundFitProgressCompletionPaddingMs = 550

type BackgroundFitViewState = {
  key: string
  view: BackgroundFitView
}

type BackgroundFitPartialViewState = {
  key: string
  view: BackgroundFitView
}

type BackgroundFitErrorState = {
  key: string
  message: string
}

type BackgroundFitProgressState = {
  key: string
  progress: BackgroundFitCalculationProgress
}

type BackgroundFitSnapshot = {
  backgroundFitErrorState: BackgroundFitErrorState | null
  backgroundFitPartialViewState: BackgroundFitPartialViewState | null
  backgroundFitProgressState: BackgroundFitProgressState | null
  backgroundFitViewState: BackgroundFitViewState | null
}

type BackgroundFitSnapshotStore = {
  getSnapshot: () => BackgroundFitSnapshot
  subscribe: (listener: () => void) => () => void
  update: (updater: (snapshot: BackgroundFitSnapshot) => BackgroundFitSnapshot) => void
}

type UseBackgroundFitViewOptions = {
  allPerksById: ReadonlyMap<string, LegendsBackgroundFitPerkRecord>
  optionalPickedPerkIds: string[]
  pickedPerkIds: string[]
  shouldAllowBackgroundStudyBook: boolean
  shouldAllowBackgroundStudyScroll: boolean
  shouldAllowSecondBackgroundStudyScroll: boolean
  shouldLoadBackgroundFitView: boolean
}

type UseBackgroundFitViewResult = {
  backgroundFitErrorMessage: string | null
  backgroundFitProgress: BackgroundFitCalculationProgress | null
  backgroundFitView: BackgroundFitView | null
  completedBackgroundFitView: BackgroundFitView | null
  isBackgroundFitProgressVisible: boolean
  isBackgroundFitViewLoading: boolean
}

const initialBackgroundFitSnapshot: BackgroundFitSnapshot = {
  backgroundFitErrorState: null,
  backgroundFitPartialViewState: null,
  backgroundFitProgressState: null,
  backgroundFitViewState: null,
}

function scheduleBackgroundFitSnapshotNotification(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    callback()

    return () => {}
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleCallbackId = window.requestIdleCallback(callback, { timeout: 100 })

    return () => window.cancelIdleCallback(idleCallbackId)
  }

  if (typeof window.requestAnimationFrame === 'function') {
    let secondAnimationFrameId: number | null = null
    const firstAnimationFrameId = window.requestAnimationFrame(() => {
      secondAnimationFrameId = window.requestAnimationFrame(callback)
    })

    return () => {
      window.cancelAnimationFrame(firstAnimationFrameId)

      if (secondAnimationFrameId !== null) {
        window.cancelAnimationFrame(secondAnimationFrameId)
      }
    }
  }

  const timeoutId = window.setTimeout(callback, 32)

  return () => window.clearTimeout(timeoutId)
}

function createBackgroundFitViewKey({
  optionalPickedPerkIds,
  pickedPerkIds,
  shouldAllowBackgroundStudyBook,
  shouldAllowBackgroundStudyScroll,
  shouldAllowSecondBackgroundStudyScroll,
}: Pick<
  UseBackgroundFitViewOptions,
  | 'optionalPickedPerkIds'
  | 'pickedPerkIds'
  | 'shouldAllowBackgroundStudyBook'
  | 'shouldAllowBackgroundStudyScroll'
  | 'shouldAllowSecondBackgroundStudyScroll'
>): string {
  return [
    pickedPerkIds.join('\u0000'),
    optionalPickedPerkIds.join('\u0000'),
    shouldAllowBackgroundStudyBook ? 'book' : 'no-book',
    shouldAllowBackgroundStudyScroll ? 'scroll' : 'no-scroll',
    shouldAllowSecondBackgroundStudyScroll ? 'second-scroll' : 'single-scroll',
  ].join('\u0001')
}

function createBackgroundFitSnapshotStore(): BackgroundFitSnapshotStore {
  let snapshot = initialBackgroundFitSnapshot
  let cancelScheduledNotification: (() => void) | null = null
  const listeners = new Set<() => void>()

  function notifyListeners() {
    cancelScheduledNotification = null

    for (const listener of listeners) {
      listener()
    }
  }

  function scheduleListenerNotification() {
    cancelScheduledNotification ??= scheduleBackgroundFitSnapshotNotification(notifyListeners)
  }

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    update(updater) {
      const nextSnapshot = updater(snapshot)

      if (nextSnapshot === snapshot) {
        return
      }

      snapshot = nextSnapshot

      scheduleListenerNotification()
    },
  }
}

export function useBackgroundFitView({
  allPerksById,
  optionalPickedPerkIds,
  pickedPerkIds,
  shouldAllowBackgroundStudyBook,
  shouldAllowBackgroundStudyScroll,
  shouldAllowSecondBackgroundStudyScroll,
  shouldLoadBackgroundFitView,
}: UseBackgroundFitViewOptions): UseBackgroundFitViewResult {
  const [backgroundFitSnapshotStore] = useState(createBackgroundFitSnapshotStore)
  const {
    backgroundFitErrorState,
    backgroundFitPartialViewState,
    backgroundFitProgressState,
    backgroundFitViewState,
  } = useSyncExternalStore(
    backgroundFitSnapshotStore.subscribe,
    backgroundFitSnapshotStore.getSnapshot,
    backgroundFitSnapshotStore.getSnapshot,
  )
  const backgroundFitWorkerClientRef = useRef<BackgroundFitWorkerClient | null>(null)
  const latestBackgroundFitRequestIdRef = useRef(0)
  const backgroundFitProgressByViewKeyRef = useRef(
    new Map<string, BackgroundFitCalculationProgress>(),
  )
  const backgroundFitCompletionProgressTimeoutRef = useRef<number | null>(null)

  const backgroundFitViewKey = useMemo(
    () =>
      createBackgroundFitViewKey({
        optionalPickedPerkIds,
        pickedPerkIds,
        shouldAllowBackgroundStudyBook,
        shouldAllowBackgroundStudyScroll,
        shouldAllowSecondBackgroundStudyScroll,
      }),
    [
      optionalPickedPerkIds,
      pickedPerkIds,
      shouldAllowBackgroundStudyBook,
      shouldAllowBackgroundStudyScroll,
      shouldAllowSecondBackgroundStudyScroll,
    ],
  )
  const completedBackgroundFitView =
    backgroundFitViewState?.key === backgroundFitViewKey ? backgroundFitViewState.view : null
  const partialBackgroundFitView =
    backgroundFitPartialViewState?.key === backgroundFitViewKey
      ? backgroundFitPartialViewState.view
      : null
  const backgroundFitView = completedBackgroundFitView ?? partialBackgroundFitView
  const backgroundFitErrorMessage =
    backgroundFitErrorState?.key === backgroundFitViewKey ? backgroundFitErrorState.message : null
  const backgroundFitProgress =
    backgroundFitProgressState?.key === backgroundFitViewKey
      ? backgroundFitProgressState.progress
      : null
  const isBackgroundFitProgressVisible =
    backgroundFitProgress !== null && backgroundFitProgress.totalBackgroundCount > 0
  const isBackgroundFitViewLoading =
    shouldLoadBackgroundFitView &&
    completedBackgroundFitView === null &&
    backgroundFitErrorMessage === null

  const clearBackgroundFitCompletionProgressTimeout = useCallback(() => {
    if (backgroundFitCompletionProgressTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(backgroundFitCompletionProgressTimeoutRef.current)
    backgroundFitCompletionProgressTimeoutRef.current = null
  }, [])

  const getBackgroundFitWorkerClient = useCallback(() => {
    backgroundFitWorkerClientRef.current ??= createBackgroundFitWorkerClient({
      calculateOnMainThread(input, options) {
        const fallbackPickedPerks = input.pickedPerkIds.flatMap((pickedPerkId) => {
          const pickedPerk = allPerksById.get(pickedPerkId)

          return pickedPerk ? [pickedPerk] : []
        })

        return import('./background-fit-main-thread').then(
          ({ calculateBackgroundFitViewOnMainThread }) =>
            calculateBackgroundFitViewOnMainThread(
              {
                ...input,
                pickedPerks: fallbackPickedPerks,
              },
              options,
            ),
        )
      },
    })

    return backgroundFitWorkerClientRef.current
  }, [allPerksById])

  useEffect(
    () => () => {
      clearBackgroundFitCompletionProgressTimeout()
      backgroundFitWorkerClientRef.current?.dispose()
      backgroundFitWorkerClientRef.current = null
    },
    [clearBackgroundFitCompletionProgressTimeout],
  )

  useEffect(() => {
    if (
      !shouldLoadBackgroundFitView ||
      completedBackgroundFitView !== null ||
      backgroundFitErrorMessage !== null
    ) {
      return
    }

    let isCancelled = false
    clearBackgroundFitCompletionProgressTimeout()
    const backgroundFitProgressByViewKey = backgroundFitProgressByViewKeyRef.current
    const backgroundFitWorkerClient = getBackgroundFitWorkerClient()
    let requestId = 0
    const backgroundFitCalculation = backgroundFitWorkerClient.calculateBackgroundFitView(
      {
        optionalPickedPerkIds,
        pickedPerkIds,
        studyResourceFilter: {
          shouldAllowBook: shouldAllowBackgroundStudyBook,
          shouldAllowScroll: shouldAllowBackgroundStudyScroll,
          shouldAllowSecondScroll: shouldAllowSecondBackgroundStudyScroll,
        },
      },
      {
        onPartialView(view, progress) {
          if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
            return
          }

          backgroundFitProgressByViewKey.set(backgroundFitViewKey, progress)

          backgroundFitSnapshotStore.update((snapshot) => ({
            ...snapshot,
            backgroundFitPartialViewState: {
              key: backgroundFitViewKey,
              view,
            },
            backgroundFitProgressState: {
              key: backgroundFitViewKey,
              progress,
            },
          }))
        },
        onProgress(progress) {
          if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
            return
          }

          backgroundFitProgressByViewKey.set(backgroundFitViewKey, progress)

          backgroundFitSnapshotStore.update((snapshot) => ({
            ...snapshot,
            backgroundFitProgressState: {
              key: backgroundFitViewKey,
              progress,
            },
          }))
        },
      },
    )

    requestId = backgroundFitCalculation.requestId
    latestBackgroundFitRequestIdRef.current = requestId

    backgroundFitCalculation.promise
      .then((nextBackgroundFitView) => {
        if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
          return
        }

        const latestProgress = backgroundFitProgressByViewKey.get(backgroundFitViewKey)
        const completionProgress =
          latestProgress && latestProgress.totalBackgroundCount > 0
            ? {
                checkedBackgroundCount: latestProgress.totalBackgroundCount,
                totalBackgroundCount: latestProgress.totalBackgroundCount,
              }
            : null

        backgroundFitSnapshotStore.update((snapshot) => ({
          ...snapshot,
          backgroundFitErrorState: null,
          backgroundFitPartialViewState: null,
          backgroundFitProgressState:
            completionProgress === null
              ? null
              : {
                  key: backgroundFitViewKey,
                  progress: completionProgress,
                },
          backgroundFitViewState: {
            key: backgroundFitViewKey,
            view: nextBackgroundFitView,
          },
        }))

        if (completionProgress !== null) {
          const completionProgressDurationMs = Math.max(
            backgroundFitCompletionProgressMinimumDurationMs,
            completionProgress.totalBackgroundCount *
              backgroundFitProgressCountMinimumStepDurationMs +
              backgroundFitProgressCompletionPaddingMs,
          )

          backgroundFitCompletionProgressTimeoutRef.current = window.setTimeout(() => {
            backgroundFitCompletionProgressTimeoutRef.current = null
            backgroundFitProgressByViewKey.delete(backgroundFitViewKey)

            if (latestBackgroundFitRequestIdRef.current !== requestId) {
              return
            }

            backgroundFitSnapshotStore.update((snapshot) =>
              snapshot.backgroundFitProgressState?.key === backgroundFitViewKey
                ? {
                    ...snapshot,
                    backgroundFitProgressState: null,
                  }
                : snapshot,
            )
          }, completionProgressDurationMs)
        }
      })
      .catch((error: unknown) => {
        if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
          return
        }

        backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
        backgroundFitSnapshotStore.update((snapshot) => ({
          ...snapshot,
          backgroundFitErrorState: {
            key: backgroundFitViewKey,
            message: error instanceof Error ? error.message : 'Background fit calculation failed.',
          },
          backgroundFitPartialViewState: null,
          backgroundFitProgressState: null,
        }))
      })

    return () => {
      isCancelled = true
      backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
    }
  }, [
    backgroundFitErrorMessage,
    completedBackgroundFitView,
    backgroundFitViewKey,
    backgroundFitSnapshotStore,
    clearBackgroundFitCompletionProgressTimeout,
    getBackgroundFitWorkerClient,
    optionalPickedPerkIds,
    pickedPerkIds,
    shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
    shouldLoadBackgroundFitView,
  ])

  return {
    backgroundFitErrorMessage,
    backgroundFitProgress,
    backgroundFitView,
    completedBackgroundFitView,
    isBackgroundFitProgressVisible,
    isBackgroundFitViewLoading,
  }
}
