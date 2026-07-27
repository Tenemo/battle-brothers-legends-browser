type LegacyPerkUrlAlias = Readonly<{
  perkIdentifier: string
  urlLabel: string
}>

const legacyPerkUrlAliases: readonly LegacyPerkUrlAlias[] = [
  {
    perkIdentifier: 'perk.legend_double_strike',
    urlLabel: 'Double Strike',
  },
  {
    perkIdentifier: 'perk.legend_daze',
    urlLabel: 'Daze--perk.legend_daze',
  },
  {
    perkIdentifier: 'perk.legend_magic_daze',
    urlLabel: 'Daze--perk.legend_magic_daze',
  },
]

export function addLegacyPerkUrlAliases({
  availablePerkIdentifiers,
  normalizeLookupValue,
  perkIdentifierByLookupValue,
}: {
  availablePerkIdentifiers: ReadonlySet<string>
  normalizeLookupValue: (value: string) => string
  perkIdentifierByLookupValue: Map<string, string>
}): void {
  for (const legacyPerkUrlAlias of legacyPerkUrlAliases) {
    if (!availablePerkIdentifiers.has(legacyPerkUrlAlias.perkIdentifier)) {
      continue
    }

    const normalizedLegacyUrlLabel = normalizeLookupValue(legacyPerkUrlAlias.urlLabel)

    if (!perkIdentifierByLookupValue.has(normalizedLegacyUrlLabel)) {
      perkIdentifierByLookupValue.set(normalizedLegacyUrlLabel, legacyPerkUrlAlias.perkIdentifier)
    }
  }
}
