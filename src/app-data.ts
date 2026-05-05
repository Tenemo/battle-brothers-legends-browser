import legendsBackgroundFitDatasetJson from './data/legends-background-fit.json'
import legendsPerkCatalogDatasetJson from './data/legends-perk-catalog.json'
import { createBackgroundFitEngine } from './lib/background-fit'
import { getCategoryCounts, getCategoryPerkGroupOptions } from './lib/category-filter-model'
import { compareCategoryNames } from './lib/dynamic-background-categories'
import { getAvailableBackgroundVeteranPerkLevelIntervals } from './lib/background-veteran-perks'
import { getPerkGroupCount, hydrateCatalogPerks } from './lib/legends-data'
import type { LegendsBackgroundFitDataset, LegendsPerkCatalogDataset } from './types/legends-perks'

export const legendsPerkCatalogDataset = legendsPerkCatalogDatasetJson as LegendsPerkCatalogDataset
const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset
export const backgroundFitEngine = createBackgroundFitEngine(legendsBackgroundFitDataset)
export const allPerks = hydrateCatalogPerks(legendsPerkCatalogDataset.perks, backgroundFitEngine)
export const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
export const legendsModRepositoryUrl = 'https://github.com/Battle-Brothers-Legends/Legends-public'
export const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'
export const personalProjectsUrl = 'https://piech.dev/projects'
export const mediumDesktopBackgroundFitMediaQuery = '(min-width: 1280px) and (max-width: 1439px)'

const allCategoryCounts = getCategoryCounts(allPerks)
export const allPerkGroupCount = getPerkGroupCount(legendsPerkCatalogDataset.perks)
export const allPerkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
export const allAvailableCategories = [...allCategoryCounts.keys()].toSorted(compareCategoryNames)
export const allBackgroundUrlOptions = legendsBackgroundFitDataset.backgroundFitBackgrounds.map(
  ({ backgroundId, sourceFilePath }) => ({
    backgroundId,
    sourceFilePath,
  }),
)
export const availableBackgroundVeteranPerkLevelIntervals =
  getAvailableBackgroundVeteranPerkLevelIntervals(
    legendsBackgroundFitDataset.backgroundFitBackgrounds,
  )
