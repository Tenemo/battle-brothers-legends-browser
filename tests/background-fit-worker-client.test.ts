import { describe, expect, test, vi } from 'vitest'
import {
  createBackgroundFitWorkerClient,
  type BackgroundFitWorkerCalculationOptions,
  type BackgroundFitWorkerInput,
  type BackgroundFitWorkerResponse,
} from '../src/lib/background-fit-worker-client'
import type { BackgroundFitView } from '../src/lib/background-fit'

const emptyBackgroundFitView = {
  rankedBackgroundFits: [],
  supportedBuildTargetPerkGroups: [],
  unsupportedBuildTargetPerkGroups: [],
} satisfies BackgroundFitView

class MockWorker extends EventTarget {
  postedMessages: unknown[] = []
  wasTerminated = false

  postMessage(message: unknown): void {
    this.postedMessages.push(message)
  }

  terminate(): void {
    this.wasTerminated = true
  }

  emitMessage(response: BackgroundFitWorkerResponse): void {
    this.dispatchEvent(new MessageEvent('message', { data: response }))
  }

  emitError(message: string): void {
    this.dispatchEvent(new ErrorEvent('error', { message }))
  }
}

const sampleWorkerInput = {
  optionalPickedPerkIds: ['perk.optional'],
  pickedPerkIds: ['perk.required', 'perk.optional'],
  studyResourceFilter: {
    shouldAllowBook: true,
    shouldAllowScroll: true,
    shouldAllowSecondScroll: false,
  },
}

describe('background fit worker client', () => {
  test('uses the synchronous fallback when workers are unavailable', async () => {
    const onPartialView = vi.fn()
    const onProgress = vi.fn()
    const calculateOnMainThread = vi.fn(
      (_input: BackgroundFitWorkerInput, options?: BackgroundFitWorkerCalculationOptions) => {
        const progress = {
          checkedBackgroundCount: 1,
          totalBackgroundCount: 2,
        }

        options?.onProgress?.(progress)
        options?.onPartialView?.(emptyBackgroundFitView, progress)

        return emptyBackgroundFitView
      },
    )
    const client = createBackgroundFitWorkerClient({
      calculateOnMainThread,
      createWorker: () => null,
    })
    const calculation = client.calculateBackgroundFitView(sampleWorkerInput, {
      onPartialView,
      onProgress,
    })

    await expect(calculation.promise).resolves.toBe(emptyBackgroundFitView)
    expect(calculation.requestId).toBe(1)
    expect(calculateOnMainThread).toHaveBeenCalledWith(sampleWorkerInput, {
      onPartialView,
      onProgress,
    })
    expect(onProgress).toHaveBeenCalledWith({
      checkedBackgroundCount: 1,
      totalBackgroundCount: 2,
    })
    expect(onPartialView).toHaveBeenCalledWith(emptyBackgroundFitView, {
      checkedBackgroundCount: 1,
      totalBackgroundCount: 2,
    })
  })

  test('posts typed requests and resolves matching worker responses', async () => {
    const worker = new MockWorker()
    const onPartialView = vi.fn()
    const onProgress = vi.fn()
    const client = createBackgroundFitWorkerClient({
      createWorker: () => worker as unknown as Worker,
    })
    const firstCalculation = client.calculateBackgroundFitView(sampleWorkerInput, {
      onPartialView,
      onProgress,
    })
    const secondCalculation = client.calculateBackgroundFitView({
      ...sampleWorkerInput,
      pickedPerkIds: ['perk.required'],
    })

    expect(worker.postedMessages).toEqual([
      expect.objectContaining({
        requestId: 1,
        type: 'calculate-background-fit-view',
      }),
      expect.objectContaining({
        pickedPerkIds: ['perk.required'],
        requestId: 2,
        type: 'calculate-background-fit-view',
      }),
    ])

    worker.emitMessage({
      requestId: 999,
      type: 'background-fit-view',
      view: emptyBackgroundFitView,
    })
    worker.emitMessage({
      progress: {
        checkedBackgroundCount: 4,
        totalBackgroundCount: 12,
      },
      requestId: firstCalculation.requestId,
      type: 'background-fit-progress',
    })
    worker.emitMessage({
      progress: {
        checkedBackgroundCount: 8,
        totalBackgroundCount: 12,
      },
      requestId: firstCalculation.requestId,
      type: 'background-fit-partial-view',
      view: emptyBackgroundFitView,
    })
    worker.emitMessage({
      requestId: secondCalculation.requestId,
      type: 'background-fit-view',
      view: emptyBackgroundFitView,
    })
    worker.emitMessage({
      requestId: firstCalculation.requestId,
      type: 'background-fit-view',
      view: emptyBackgroundFitView,
    })

    await expect(secondCalculation.promise).resolves.toBe(emptyBackgroundFitView)
    await expect(firstCalculation.promise).resolves.toBe(emptyBackgroundFitView)
    expect(onProgress).toHaveBeenCalledWith({
      checkedBackgroundCount: 4,
      totalBackgroundCount: 12,
    })
    expect(onPartialView).toHaveBeenCalledWith(emptyBackgroundFitView, {
      checkedBackgroundCount: 8,
      totalBackgroundCount: 12,
    })

    client.dispose()
    expect(worker.wasTerminated).toBe(true)
  })

  test('rejects worker calculation errors', async () => {
    const worker = new MockWorker()
    const client = createBackgroundFitWorkerClient({
      createWorker: () => worker as unknown as Worker,
    })
    const calculation = client.calculateBackgroundFitView(sampleWorkerInput)

    worker.emitMessage({
      message: 'Could not rank backgrounds.',
      requestId: calculation.requestId,
      type: 'background-fit-error',
    })

    await expect(calculation.promise).rejects.toThrow('Could not rank backgrounds.')
  })

  test('rejects pending calculations when the worker errors', async () => {
    const worker = new MockWorker()
    const client = createBackgroundFitWorkerClient({
      createWorker: () => worker as unknown as Worker,
    })
    const calculation = client.calculateBackgroundFitView(sampleWorkerInput)

    worker.emitError('Worker crashed.')

    await expect(calculation.promise).rejects.toThrow('Worker crashed.')
  })
})
