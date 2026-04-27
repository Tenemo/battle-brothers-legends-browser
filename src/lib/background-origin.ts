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

const originBackgroundPillLabelsBySourceLabel = new Map<string, string>([
  ['crusader', 'Origin: Crusader/Inquisition'],
  ['legend_battle_sister', 'Origin: Sisterhood'],
  ['legend_berserker', 'Origin: Berserker'],
  ['legend_bladedancer', 'Origin: Nomad'],
  ['legend_bounty_hunter', 'Origin: Assassin'],
  ['legend_crusader', 'Origin: Crusader'],
  ['legend_guildmaster', 'Origin: Beast slayers'],
  ['legend_husk', 'Origin: Davkul'],
  ['legend_leech_peddler', 'Origin: Peasant militia'],
  ['legend_lonewolf', 'Origin: Lone wolf'],
  ['legend_lurker', 'Origin: Davkul'],
  ['legend_magister', 'Origin: Davkul'],
  ['legend_man_at_arms', 'Origin: Peasant militia'],
  ['legend_nightwatch', 'Origin: Peasant militia'],
  ['legend_pilgrim', 'Origin: Crusader'],
  ['legend_preserver', 'Origin: Necromancer'],
  ['legend_puppet_master', 'Origin: Necromancer'],
  ['legend_warlock_summoner', 'Origin: Necromancer'],
  ['legend_youngblood', 'Origin: Crusader/Inquisition'],
])

const legionOriginBackgroundSourceLabels = new Set([
  'legend_legion_auxiliary',
  'legend_legion_centurion',
  'legend_legion_gladiator',
  'legend_legion_honour_guard',
  'legend_legion_legate',
  'legend_legion_legionary',
  'legend_legion_prefect',
  'legend_legion_slave',
])

function isCommanderOriginBackgroundSourceLabel(sourceLabel: string): boolean {
  return (
    /^legend_.+_commander(?:_op)?$/u.test(sourceLabel) ||
    /^.+_legend_.+_commander$/u.test(sourceLabel)
  )
}

function getOriginBackgroundPillLabelForSourceLabel(label: string): string | null {
  const sourceLabel = getBackgroundSourceLabel(label)
  const pillLabel = originBackgroundPillLabelsBySourceLabel.get(sourceLabel)

  if (pillLabel !== undefined) {
    return pillLabel
  }

  if (legionOriginBackgroundSourceLabels.has(sourceLabel)) {
    return 'Origin: Legion'
  }

  if (isCommanderOriginBackgroundSourceLabel(sourceLabel)) {
    return 'Origin commander'
  }

  return null
}

function isOriginBackgroundSourceLabel(label: string): boolean {
  const sourceLabel = getBackgroundSourceLabel(label)

  return (
    /^companion_(1h|2h|ranged)$/.test(sourceLabel) ||
    /^legend_companion_(melee|ranged)$/.test(sourceLabel) ||
    originBackgroundPillLabelsBySourceLabel.has(sourceLabel) ||
    legionOriginBackgroundSourceLabels.has(sourceLabel) ||
    isCommanderOriginBackgroundSourceLabel(sourceLabel)
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
  // that already drive origin disambiguator labels such as "Origin melee" and "Origin commander".
  return candidateLabels.some((candidateLabel) => isOriginBackgroundSourceLabel(candidateLabel))
}
