import legendsBackgroundFitDatasetJson from '../data/legends-background-fit.json'
import { createBackgroundFitEngine, type BackgroundFitView } from './background-fit'
import type {
  BackgroundFitWorkerCalculationOptions,
  BackgroundFitWorkerInput,
} from './background-fit-worker-client'
import type {
  LegendsBackgroundFitDataset,
  LegendsBackgroundFitPerkRecord,
} from '../types/legends-perks'

type BackgroundFitMainThreadInput = BackgroundFitWorkerInput & {
  pickedPerks: LegendsBackgroundFitPerkRecord[]
}

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset
const backgroundFitEngine = createBackgroundFitEngine(legendsBackgroundFitDataset)

export function calculateBackgroundFitViewOnMainThread(
  input: BackgroundFitMainThreadInput,
  options?: BackgroundFitWorkerCalculationOptions,
): BackgroundFitView {
  return backgroundFitEngine.getBackgroundFitView(input.pickedPerks, input.studyResourceFilter, {
    onPartialView: options?.onPartialView
      ? (partialView) => {
          options.onPartialView?.(partialView.view, {
            checkedBackgroundCount: partialView.checkedBackgroundCount,
            totalBackgroundCount: partialView.totalBackgroundCount,
          })
        }
      : undefined,
    onProgress: options?.onProgress,
    optionalPickedPerkIds: new Set(input.optionalPickedPerkIds),
  })
}
