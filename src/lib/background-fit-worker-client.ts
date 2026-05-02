import type { BackgroundFitCalculationProgress, BackgroundFitView } from './background-fit'
import type { BackgroundStudyResourceFilter } from './background-study-reachability'

export type BackgroundFitWorkerInput = {
  optionalPickedPerkIds: string[]
  pickedPerkIds: string[]
  studyResourceFilter: BackgroundStudyResourceFilter
}

export type BackgroundFitWorkerRequest = BackgroundFitWorkerInput & {
  requestId: number
  type: 'calculate-background-fit-view'
}

export type BackgroundFitWorkerResponse =
  | {
      progress: BackgroundFitCalculationProgress
      requestId: number
      type: 'background-fit-progress'
    }
  | {
      progress: BackgroundFitCalculationProgress
      requestId: number
      type: 'background-fit-partial-view'
      view: BackgroundFitView
    }
  | {
      requestId: number
      type: 'background-fit-view'
      view: BackgroundFitView
    }
  | {
      message: string
      requestId: number
      type: 'background-fit-error'
    }
  | {
      requestId: number
      type: 'background-fit-superseded'
    }

type BackgroundFitWorkerCalculation = {
  promise: Promise<BackgroundFitView>
  requestId: number
}

export type BackgroundFitWorkerCalculationOptions = {
  onPartialView?: (view: BackgroundFitView, progress: BackgroundFitCalculationProgress) => void
  onProgress?: (progress: BackgroundFitCalculationProgress) => void
}

export type BackgroundFitWorkerClient = {
  calculateBackgroundFitView: (
    input: BackgroundFitWorkerInput,
    options?: BackgroundFitWorkerCalculationOptions,
  ) => BackgroundFitWorkerCalculation
  dispose: () => void
}

type PendingCalculation = {
  onPartialView?: (view: BackgroundFitView, progress: BackgroundFitCalculationProgress) => void
  onProgress?: (progress: BackgroundFitCalculationProgress) => void
  reject: (error: Error) => void
  resolve: (view: BackgroundFitView) => void
}

type BackgroundFitWorkerClientOptions = {
  calculateOnMainThread?: (
    input: BackgroundFitWorkerInput,
    options?: BackgroundFitWorkerCalculationOptions,
  ) => BackgroundFitView | Promise<BackgroundFitView>
  createWorker?: () => Worker | null
}

function createDefaultBackgroundFitWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null
  }

  return new Worker(new URL('../workers/background-fit.worker.ts', import.meta.url), {
    name: 'background-fit',
    type: 'module',
  })
}

export function createBackgroundFitWorkerClient({
  calculateOnMainThread,
  createWorker = createDefaultBackgroundFitWorker,
}: BackgroundFitWorkerClientOptions = {}): BackgroundFitWorkerClient {
  const worker = createWorker()
  const pendingCalculationsByRequestId = new Map<number, PendingCalculation>()
  let nextRequestId = 0

  if (worker) {
    worker.addEventListener('message', (event: MessageEvent<BackgroundFitWorkerResponse>) => {
      const response = event.data
      const pendingCalculation = pendingCalculationsByRequestId.get(response.requestId)

      if (!pendingCalculation) {
        return
      }

      if (response.type === 'background-fit-progress') {
        pendingCalculation.onProgress?.(response.progress)
        return
      }

      if (response.type === 'background-fit-partial-view') {
        pendingCalculation.onPartialView?.(response.view, response.progress)
        return
      }

      pendingCalculationsByRequestId.delete(response.requestId)

      if (response.type === 'background-fit-error') {
        pendingCalculation.reject(new Error(response.message))
        return
      }

      if (response.type === 'background-fit-superseded') {
        pendingCalculation.reject(new Error('Background fit request was superseded.'))
        return
      }

      pendingCalculation.resolve(response.view)
    })

    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Background fit worker failed.')

      for (const pendingCalculation of pendingCalculationsByRequestId.values()) {
        pendingCalculation.reject(error)
      }

      pendingCalculationsByRequestId.clear()
    })
  }

  return {
    calculateBackgroundFitView(input, options = {}) {
      const requestId = (nextRequestId += 1)

      if (!worker) {
        if (!calculateOnMainThread) {
          return {
            promise: Promise.reject(new Error('Background fit worker is unavailable.')),
            requestId,
          }
        }

        return {
          promise: Promise.resolve().then(() => calculateOnMainThread(input, options)),
          requestId,
        }
      }

      const promise = new Promise<BackgroundFitView>((resolve, reject) => {
        pendingCalculationsByRequestId.set(requestId, {
          onPartialView: options.onPartialView,
          onProgress: options.onProgress,
          reject,
          resolve,
        })
      })
      const request = {
        ...input,
        requestId,
        type: 'calculate-background-fit-view',
      } satisfies BackgroundFitWorkerRequest

      worker.postMessage(request)

      return { promise, requestId }
    },
    dispose() {
      worker?.terminate()

      for (const pendingCalculation of pendingCalculationsByRequestId.values()) {
        pendingCalculation.reject(new Error('Background fit worker was disposed.'))
      }

      pendingCalculationsByRequestId.clear()
    },
  }
}
