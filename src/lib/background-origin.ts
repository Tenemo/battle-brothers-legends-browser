import type { RankedBackgroundFit } from './background-fit'

export function getBackgroundSourceLabel(label: string): string {
  return label.replace(/^background\./, '').toLowerCase()
}

function getBackgroundSourceFileLabel(sourceFilePath: string): string {
  const sourceFileName = sourceFilePath.split('/').at(-1) ?? sourceFilePath

  return sourceFileName
    .replace(/_background\.nut$/u, '')
    .replace(/\.nut$/u, '')
    .toLowerCase()
}

function getBackgroundFitOriginCandidateLabels(backgroundFit: RankedBackgroundFit): string[] {
  return [
    backgroundFit.backgroundId,
    backgroundFit.disambiguator,
    getBackgroundSourceFileLabel(backgroundFit.sourceFilePath),
  ].filter((candidateLabel): candidateLabel is string => typeof candidateLabel === 'string')
}

function getOriginBackgroundPillLabelForSourceLabel(label: string): string | null {
  const sourceLabel = getBackgroundSourceLabel(label)

  if (sourceLabel === 'legend_crusader') {
    return 'origin crusader'
  }

  return null
}

function isOriginBackgroundSourceLabel(label: string): boolean {
  const sourceLabel = getBackgroundSourceLabel(label)

  return (
    /^companion_(1h|2h|ranged)$/.test(sourceLabel) ||
    /^legend_companion_(melee|ranged)$/.test(sourceLabel) ||
    sourceLabel === 'legend_berserker' ||
    sourceLabel === 'legend_crusader' ||
    /^legend_.+_commander(?:_op)?$/.test(sourceLabel) ||
    /^.+_legend_.+_commander$/.test(sourceLabel)
  )
}

export function getOriginBackgroundPillLabel(backgroundFit: RankedBackgroundFit): string | null {
  for (const candidateLabel of getBackgroundFitOriginCandidateLabels(backgroundFit)) {
    const pillLabel = getOriginBackgroundPillLabelForSourceLabel(candidateLabel)

    if (pillLabel !== null) {
      return pillLabel
    }
  }

  return null
}

export function isOriginBackgroundFit(backgroundFit: RankedBackgroundFit): boolean {
  const candidateLabels = getBackgroundFitOriginCandidateLabels(backgroundFit)

  // The imported background model has no explicit origin flag, so this mirrors the source names
  // that already drive origin disambiguator labels such as "origin melee" and "origin commander".
  return candidateLabels.some((candidateLabel) => isOriginBackgroundSourceLabel(candidateLabel))
}
