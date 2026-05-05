import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BackgroundFitCalculationProgress,
  BackgroundFitEngine,
  BackgroundFitView,
} from './background-fit'
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

type UseBackgroundFitViewOptions = {
  allPerksById: ReadonlyMap<string, LegendsBackgroundFitPerkRecord>
  backgroundFitEngine: BackgroundFitEngine
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

export function useBackgroundFitView({
  allPerksById,
  backgroundFitEngine,
  optionalPickedPerkIds,
  pickedPerkIds,
  shouldAllowBackgroundStudyBook,
  shouldAllowBackgroundStudyScroll,
  shouldAllowSecondBackgroundStudyScroll,
  shouldLoadBackgroundFitView,
}: UseBackgroundFitViewOptions): UseBackgroundFitViewResult {
  const [backgroundFitViewState, setBackgroundFitViewState] =
    useState<BackgroundFitViewState | null>(null)
  const [backgroundFitPartialViewState, setBackgroundFitPartialViewState] =
    useState<BackgroundFitPartialViewState | null>(null)
  const [backgroundFitErrorState, setBackgroundFitErrorState] =
    useState<BackgroundFitErrorState | null>(null)
  const [backgroundFitProgressState, setBackgroundFitProgressState] =
    useState<BackgroundFitProgressState | null>(null)
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
      calculateOnMainThread(
        {
          optionalPickedPerkIds: fallbackOptionalPickedPerkIds,
          pickedPerkIds: fallbackPickedPerkIds,
          studyResourceFilter,
        },
        options,
      ) {
        const fallbackPickedPerks = fallbackPickedPerkIds.flatMap((pickedPerkId) => {
          const pickedPerk = allPerksById.get(pickedPerkId)

          return pickedPerk ? [pickedPerk] : []
        })

        return backgroundFitEngine.getBackgroundFitView(fallbackPickedPerks, studyResourceFilter, {
          onPartialView: options?.onPartialView
            ? (partialView) => {
                options.onPartialView?.(partialView.view, {
                  checkedBackgroundCount: partialView.checkedBackgroundCount,
                  totalBackgroundCount: partialView.totalBackgroundCount,
                })
              }
            : undefined,
          onProgress: options?.onProgress,
          optionalPickedPerkIds: new Set(fallbackOptionalPickedPerkIds),
        })
      },
    })

    return backgroundFitWorkerClientRef.current
  }, [allPerksById, backgroundFitEngine])

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

          startTransition(() => {
            setBackgroundFitProgressState({
              key: backgroundFitViewKey,
              progress,
            })
            setBackgroundFitPartialViewState({
              key: backgroundFitViewKey,
              view,
            })
          })
        },
        onProgress(progress) {
          if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
            return
          }

          backgroundFitProgressByViewKey.set(backgroundFitViewKey, progress)

          startTransition(() => {
            setBackgroundFitProgressState({
              key: backgroundFitViewKey,
              progress,
            })
          })
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

        startTransition(() => {
          setBackgroundFitErrorState(null)
          setBackgroundFitPartialViewState(null)
          setBackgroundFitProgressState(
            completionProgress === null
              ? null
              : {
                  key: backgroundFitViewKey,
                  progress: completionProgress,
                },
          )
          setBackgroundFitViewState({
            key: backgroundFitViewKey,
            view: nextBackgroundFitView,
          })
        })

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

            startTransition(() => {
              setBackgroundFitProgressState((currentProgressState) =>
                currentProgressState?.key === backgroundFitViewKey ? null : currentProgressState,
              )
            })
          }, completionProgressDurationMs)
        }
      })
      .catch((error: unknown) => {
        if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
          return
        }

        backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
        setBackgroundFitErrorState({
          key: backgroundFitViewKey,
          message: error instanceof Error ? error.message : 'Background fit calculation failed.',
        })
        setBackgroundFitPartialViewState(null)
        setBackgroundFitProgressState(null)
      })

    return () => {
      isCancelled = true
      backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
    }
  }, [
    backgroundFitErrorMessage,
    completedBackgroundFitView,
    backgroundFitViewKey,
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
