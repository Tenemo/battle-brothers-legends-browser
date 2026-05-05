import type {
  LegendsBackgroundCampResourceModifier,
  LegendsBackgroundCampResourceModifierGroup,
} from '../types/legends-perks'

const backgroundTalentAttributeIconPathsByNormalizedName: Readonly<Record<string, string>> = {
  fatigue: 'ui/icons/fatigue_va11.png',
  hitpoints: 'ui/icons/health_va11.png',
  initiative: 'ui/icons/initiative_va11.png',
  'melee defense': 'ui/icons/melee_defense_va11.png',
  'melee skill': 'ui/icons/melee_skill_va11.png',
  'ranged defense': 'ui/icons/ranged_defense_va11.png',
  'ranged skill': 'ui/icons/ranged_skill_va11.png',
  resolve: 'ui/icons/bravery_va11.png',
}

export function getGroupedCampResourceModifiers(
  campResourceModifiers: LegendsBackgroundCampResourceModifier[],
): {
  group: LegendsBackgroundCampResourceModifierGroup
  modifiers: LegendsBackgroundCampResourceModifier[]
}[] {
  const backgroundCampResourceModifierGroupOrder: LegendsBackgroundCampResourceModifierGroup[] = [
    'capacity',
    'skill',
    'terrain',
  ]

  return backgroundCampResourceModifierGroupOrder.flatMap((group) => {
    const modifiers = campResourceModifiers.filter((modifier) => modifier.group === group)

    return modifiers.length > 0 ? [{ group, modifiers }] : []
  })
}

function normalizeBackgroundTalentAttributeName(attributeName: string): string {
  return attributeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getBackgroundTalentAttributeIconPath(attributeName: string): string | null {
  return (
    backgroundTalentAttributeIconPathsByNormalizedName[
      normalizeBackgroundTalentAttributeName(attributeName)
    ] ?? null
  )
}

export function getBackgroundTalentAttributeIconTestId(attributeName: string): string {
  return `detail-background-talent-attribute-icon-${normalizeBackgroundTalentAttributeName(
    attributeName,
  ).replaceAll(' ', '-')}`
}
