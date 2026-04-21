import technicalNameMappingsJson from '../data/technical-name-mappings.json'

const technicalNameMappings = technicalNameMappingsJson as {
  labelsByTechnicalName: Record<string, string>
}

function normalizeComparisonValue(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '').toLocaleLowerCase()
}

export function getTechnicalNameLabel(value: string): string | null {
  return technicalNameMappings.labelsByTechnicalName[value] ?? null
}

export function technicalNameMatchesDisplayName(
  technicalName: string,
  displayName: string,
): boolean {
  const exactLabel = getTechnicalNameLabel(technicalName)

  if (exactLabel === null) {
    return false
  }

  return normalizeComparisonValue(exactLabel) === normalizeComparisonValue(displayName)
}
