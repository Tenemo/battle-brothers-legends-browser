import {
  createDataset,
  createTechnicalNameMappings,
  writeDatasetFile,
  writeTechnicalNameMappingsFile,
} from './legends-perks-importer.mjs'
import { ensureLatestLegendsReference } from './ensure-legends-reference.mjs'
import { syncLegendsIcons } from './legends-icon-sync.mjs'

const referenceMetadata = await ensureLatestLegendsReference()
const dataset = await createDataset(referenceMetadata.referenceRootDirectoryPath, {
  referenceVersion: referenceMetadata.tagName,
})
await writeDatasetFile(dataset)
await writeTechnicalNameMappingsFile(createTechnicalNameMappings(dataset))
const iconSyncResult = await syncLegendsIcons({ dataset })

console.log(
  `Synced ${dataset.perkCount} perks across ${dataset.treeCount} trees from ${dataset.sourceFiles.length} source files in Legends ${referenceMetadata.tagName} and ${iconSyncResult.extractedIconCount} icons from ${iconSyncResult.archivePaths.length} local archives.`,
)

if (iconSyncResult.missingIconPaths.length > 0) {
  console.warn(
    `Missing ${iconSyncResult.missingIconPaths.length} icon files:\n${iconSyncResult.missingIconPaths.join('\n')}`,
  )
}

if (referenceMetadata.cacheFallbackReason) {
  console.warn(
    `GitHub refresh failed. Reused the cached Legends dependency instead:\n${referenceMetadata.cacheFallbackReason}`,
  )
}
