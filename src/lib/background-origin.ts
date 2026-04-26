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

function isOriginBackgroundSourceLabel(label: string): boolean {
  const sourceLabel = getBackgroundSourceLabel(label)

  return (
    /^companion_(1h|2h|ranged)$/.test(sourceLabel) ||
    /^legend_companion_(melee|ranged)$/.test(sourceLabel) ||
    sourceLabel === 'legend_berserker' ||
    /^legend_.+_commander(?:_op)?$/.test(sourceLabel) ||
    /^.+_legend_.+_commander$/.test(sourceLabel)
  )
}

export function isOriginBackgroundFit(backgroundFit: RankedBackgroundFit): boolean {
  const candidateLabels = [
    backgroundFit.backgroundId,
    backgroundFit.disambiguator,
    getBackgroundSourceFileLabel(backgroundFit.sourceFilePath),
  ]

  // The imported background model has no explicit origin flag, so this mirrors the source names
  // that already drive origin disambiguator labels such as "origin melee" and "origin commander".
  return candidateLabels.some(
    (candidateLabel) =>
      typeof candidateLabel === 'string' && isOriginBackgroundSourceLabel(candidateLabel),
  )
}
