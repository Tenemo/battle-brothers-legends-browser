import { syncLegendsIcons } from './legends-icon-sync.mjs'

const result = await syncLegendsIcons()

console.log(
  `Synced ${result.extractedIconCount} icons from ${result.archivePaths.length} local archives in ${result.gameDirectoryPath}.`,
)

if (result.missingIconPaths.length > 0) {
  console.warn(
    `Missing ${result.missingIconPaths.length} icon files:\n${result.missingIconPaths.join('\n')}`,
  )
}
