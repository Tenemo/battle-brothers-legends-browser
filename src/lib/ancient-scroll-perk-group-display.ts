import { isAncientScrollLearnablePerkGroupId } from './origin-and-ancient-scroll-perk-groups'

export const ancientScrollIconPath = 'ui/items/trade/scroll.png'
export const ancientScrollPerkGroupMarkerTestId = 'ancient-scroll-perk-group-marker'

export function hasAncientScrollLearnablePerkGroup(perkGroupIds: readonly string[]): boolean {
  return perkGroupIds.some((perkGroupId) => isAncientScrollLearnablePerkGroupId(perkGroupId))
}
