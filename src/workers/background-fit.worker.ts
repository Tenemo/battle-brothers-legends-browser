import legendsPerksDatasetJson from '../data/legends-perks.json'
import { createBackgroundFitEngine } from '../lib/background-fit'
import type {
  BackgroundFitWorkerRequest,
  BackgroundFitWorkerResponse,
} from '../lib/background-fit-worker-client'
import type { LegendsPerksDataset } from '../types/legends-perks'

type BackgroundFitWorkerScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<BackgroundFitWorkerRequest>) => void,
  ) => void
  postMessage: (response: BackgroundFitWorkerResponse) => void
  setTimeout: (callback: () => void, timeout: number) => number
}

const workerScope = self as unknown as BackgroundFitWorkerScope
const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const perksById = new Map(legendsPerksDataset.perks.map((perk) => [perk.id, perk]))

let pendingRequest: BackgroundFitWorkerRequest | null = null
let isProcessingPendingRequest = false
let latestRequestId = 0

function postBackgroundFitResponse(response: BackgroundFitWorkerResponse): void {
  workerScope.postMessage(response)
}

function yieldToWorkerEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    workerScope.setTimeout(resolve, 0)
  })
}

function calculateBackgroundFitView(request: BackgroundFitWorkerRequest) {
  const pickedPerks = request.pickedPerkIds.flatMap((pickedPerkId) => {
    const pickedPerk = perksById.get(pickedPerkId)

    return pickedPerk ? [pickedPerk] : []
  })

  return backgroundFitEngine.getBackgroundFitView(pickedPerks, request.studyResourceFilter, {
    optionalPickedPerkIds: new Set(request.optionalPickedPerkIds),
  })
}

async function processPendingRequests(): Promise<void> {
  if (isProcessingPendingRequest) {
    return
  }

  isProcessingPendingRequest = true

  try {
    while (pendingRequest) {
      const request = pendingRequest
      pendingRequest = null

      try {
        const view = calculateBackgroundFitView(request)

        if (request.requestId === latestRequestId) {
          postBackgroundFitResponse({
            requestId: request.requestId,
            type: 'background-fit-view',
            view,
          })
        }
      } catch (error) {
        if (request.requestId === latestRequestId) {
          postBackgroundFitResponse({
            message: error instanceof Error ? error.message : 'Background fit calculation failed.',
            requestId: request.requestId,
            type: 'background-fit-error',
          })
        }
      }

      await yieldToWorkerEventLoop()
    }
  } finally {
    isProcessingPendingRequest = false

    if (pendingRequest) {
      void processPendingRequests()
    }
  }
}

workerScope.addEventListener('message', (event: MessageEvent<BackgroundFitWorkerRequest>) => {
  const request = event.data

  if (request.type !== 'calculate-background-fit-view') {
    return
  }

  latestRequestId = request.requestId
  pendingRequest = request
  void processPendingRequests()
})
