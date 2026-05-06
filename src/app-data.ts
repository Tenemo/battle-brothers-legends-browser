import legendsPerkCatalogDatasetJson from './data/legends-perk-catalog.json'
import legendsPlannerMetadataDatasetJson from './data/legends-planner-metadata.json'
import { getCategoryCounts, getCategoryPerkGroupOptions } from './lib/category-filter-model'
import { compareCategoryNames } from './lib/dynamic-background-categories'
import { getPerkGroupCount, hydrateCatalogPerks } from './lib/legends-data'
import type {
  LegendsPerkCatalogDataset,
  LegendsPlannerMetadataDataset,
} from './types/legends-perks'

export const legendsPerkCatalogDataset = legendsPerkCatalogDatasetJson as LegendsPerkCatalogDataset
const legendsPlannerMetadataDataset =
  legendsPlannerMetadataDatasetJson as LegendsPlannerMetadataDataset
export const allPerks = hydrateCatalogPerks(
  legendsPerkCatalogDataset.perks,
  legendsPerkCatalogDataset.backgroundSourceTable,
)
export const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
export const legendsModRepositoryUrl = 'https://github.com/Battle-Brothers-Legends/Legends-public'
export const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'
export const personalProjectsUrl = 'https://piech.dev/projects'
export const mediumDesktopBackgroundFitMediaQuery = '(min-width: 1280px) and (max-width: 1439px)'

const allCategoryCounts = getCategoryCounts(allPerks)
export const allPerkGroupCount = getPerkGroupCount(legendsPerkCatalogDataset.perks)
export const allPerkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
export const allAvailableCategories = [...allCategoryCounts.keys()].toSorted(compareCategoryNames)
export const allBackgroundUrlOptions = legendsPlannerMetadataDataset.backgroundUrlOptions
export const availableBackgroundVeteranPerkLevelIntervals =
  legendsPlannerMetadataDataset.availableBackgroundVeteranPerkLevelIntervals
