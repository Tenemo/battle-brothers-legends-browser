import type { BackgroundFitView } from './background-fit'

const defaultBackgroundFitAsyncWorkChunkSize = 1

export type BackgroundFitAsyncControlOptions = {
  isCancelled?: () => boolean
  workChunkSize?: number
  yieldControl?: () => Promise<void>
}

class BackgroundFitCalculationCancelledError extends Error {
  constructor() {
    super('Background fit calculation was cancelled.')
    this.name = 'BackgroundFitCalculationCancelledError'
  }
}

export function isBackgroundFitCalculationCancelledError(
  error: unknown,
): error is BackgroundFitCalculationCancelledError {
  return error instanceof BackgroundFitCalculationCancelledError
}

function getValidatedBackgroundFitAsyncWorkChunkSize(workChunkSize: number | undefined): number {
  if (workChunkSize === undefined || !Number.isFinite(workChunkSize)) {
    return defaultBackgroundFitAsyncWorkChunkSize
  }

  return Math.max(1, Math.floor(workChunkSize))
}

export function runBackgroundFitViewGeneratorToCompletion(
  generator: Generator<void, BackgroundFitView, void>,
): BackgroundFitView {
  let result = generator.next()

  while (!result.done) {
    result = generator.next()
  }

  return result.value
}

export async function runBackgroundFitViewGeneratorAsync(
  generator: Generator<void, BackgroundFitView, void>,
  options: BackgroundFitAsyncControlOptions,
): Promise<BackgroundFitView> {
  const workChunkSize = getValidatedBackgroundFitAsyncWorkChunkSize(options.workChunkSize)
  const yieldControl = options.yieldControl ?? (() => Promise.resolve())
  let processedBackgroundCountSinceYield = 0
  let result = generator.next()

  while (!result.done) {
    if (options.isCancelled?.()) {
      throw new BackgroundFitCalculationCancelledError()
    }

    processedBackgroundCountSinceYield += 1

    if (processedBackgroundCountSinceYield >= workChunkSize) {
      processedBackgroundCountSinceYield = 0
      await yieldControl()

      if (options.isCancelled?.()) {
        throw new BackgroundFitCalculationCancelledError()
      }
    }

    result = generator.next()
  }

  return result.value
}
