import type { BuildPlannerDetailSelection, BuildPlannerUrlState } from './build-planner-url-state'
import { createBackgroundFitKey, parseBackgroundFitKey } from './perk-display'

export type ActiveDetailSelection =
  | {
      type: 'background'
      backgroundFitKey: string
    }
  | {
      type: 'perk'
    }

export type DetailHistoryNavigationDirection = -1 | 1

type DetailHistoryEntry = {
  key: string
  urlState: BuildPlannerUrlState
}

type DetailHistoryState = {
  entries: DetailHistoryEntry[]
  index: number
}

export function createActiveDetailSelectionFromUrl(
  detailSelection: BuildPlannerDetailSelection,
): ActiveDetailSelection {
  if (detailSelection.type !== 'background') {
    return { type: 'perk' }
  }

  return {
    backgroundFitKey: createBackgroundFitKey(detailSelection),
    type: 'background',
  }
}

export function getSelectedPerkIdFromUrl(
  detailSelection: BuildPlannerDetailSelection,
): string | null {
  return detailSelection.type === 'perk' ? detailSelection.perkId : null
}

function getDetailSelectionHistoryKey(detailSelection: BuildPlannerDetailSelection): string | null {
  if (detailSelection.type === 'perk') {
    return `perk\u0000${detailSelection.perkId}`
  }

  if (detailSelection.type === 'background') {
    return `background\u0000${detailSelection.backgroundId}\u0000${detailSelection.sourceFilePath}`
  }

  return null
}

function createDetailHistoryEntry(urlState: BuildPlannerUrlState): DetailHistoryEntry | null {
  const key = getDetailSelectionHistoryKey(urlState.detailSelection)

  return key === null ? null : { key, urlState }
}

export function createInitialDetailHistoryState(
  urlState: BuildPlannerUrlState,
): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  return entry
    ? {
        entries: [entry],
        index: 0,
      }
    : {
        entries: [],
        index: -1,
      }
}

function replaceDetailHistoryEntry(
  detailHistoryState: DetailHistoryState,
  index: number,
  entry: DetailHistoryEntry,
): DetailHistoryState {
  if (detailHistoryState.entries[index]?.urlState === entry.urlState) {
    return detailHistoryState.index === index
      ? detailHistoryState
      : {
          entries: detailHistoryState.entries,
          index,
        }
  }

  const entries = [...detailHistoryState.entries]
  entries[index] = entry

  return {
    entries,
    index,
  }
}

export function recordDetailHistoryUrlState(
  detailHistoryState: DetailHistoryState,
  urlState: BuildPlannerUrlState,
): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  if (entry === null) {
    return detailHistoryState
  }

  if (detailHistoryState.entries[detailHistoryState.index]?.key === entry.key) {
    return replaceDetailHistoryEntry(detailHistoryState, detailHistoryState.index, entry)
  }

  const retainedEntries =
    detailHistoryState.index >= 0
      ? detailHistoryState.entries.slice(0, detailHistoryState.index + 1)
      : []

  return {
    entries: [...retainedEntries, entry],
    index: retainedEntries.length,
  }
}

export function syncDetailHistoryUrlStateFromBrowser(
  detailHistoryState: DetailHistoryState,
  urlState: BuildPlannerUrlState,
): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  if (entry === null) {
    return detailHistoryState
  }

  const matchingEntryIndex = detailHistoryState.entries.findIndex(
    (detailHistoryEntry) => detailHistoryEntry.key === entry.key,
  )

  return matchingEntryIndex === -1
    ? recordDetailHistoryUrlState(detailHistoryState, urlState)
    : replaceDetailHistoryEntry(detailHistoryState, matchingEntryIndex, entry)
}

export function createBackgroundDetailSelectionFromKey(
  backgroundFitKey: string,
): BuildPlannerDetailSelection {
  const backgroundFitKeyParts = parseBackgroundFitKey(backgroundFitKey)

  return backgroundFitKeyParts ? { ...backgroundFitKeyParts, type: 'background' } : { type: 'none' }
}

export function createUrlDetailSelection({
  activeDetailSelection,
  selectedPerk,
}: {
  activeDetailSelection: ActiveDetailSelection
  selectedPerk: { id: string } | null
}): BuildPlannerDetailSelection {
  if (activeDetailSelection.type === 'background') {
    return createBackgroundDetailSelectionFromKey(activeDetailSelection.backgroundFitKey)
  }

  return selectedPerk ? { perkId: selectedPerk.id, type: 'perk' } : { type: 'none' }
}
