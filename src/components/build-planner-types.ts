import type { BuildPerkPillSelection } from './BuildPerkPill'

export type BuildPlannerSavedBuild = {
  availablePerkIds: string[]
  id: string
  missingPerkCount: number
  name: string
  perkNames: string[]
  pickedPerkCount: number
  referenceVersion: string
  updatedAt: string
}

export type SavedBuildOperationStatus =
  | 'copied'
  | 'copy-error'
  | 'deleted'
  | 'idle'
  | 'loaded'
  | 'saved'

export type PlannerPerkGroupSelection = BuildPerkPillSelection
