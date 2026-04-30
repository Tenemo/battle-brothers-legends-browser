import type { BuildPerkPillSelection } from './BuildPerkPill'
import type { LegendsPerkRecord } from '../types/legends-perks'

export type BuildPlannerPickedPerk = LegendsPerkRecord & {
  isOptional: boolean
}

export type BuildPlannerSavedBuild = {
  availablePerkIds: string[]
  optionalPerkIds: string[]
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
