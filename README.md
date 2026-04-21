# Battle Brothers legends perks browser

A dark Vite + React app for browsing and searching Battle Brothers Legends perk data generated from the latest official `Battle-Brothers-Legends/Legends-public` GitHub release, cached locally in a `.gitignored` directory, with perk icons synced read-only from a local Battle Brothers install.

## Available scripts

- `npm run dev` starts the local Vite app.
- `npm run ensure:legends-reference` downloads or refreshes the cached Legends source dependency under `.cache/legends-public/current` when needed.
- `npm run sync:perks` refreshes the cached GitHub dependency, reparses the local reference files, rewrites `src/data/legends-perks.json` and `src/data/technical-name-mappings.json`, and syncs the referenced perk icons from the local game archives into `public/game-icons`.
- `npm run sync:icons` resyncs just the referenced perk icons from the local game archives.
- `npm run tsc` runs the TypeScript build check.
- `npm run eslint` runs ESLint.
- `npm run build` creates the production bundle.
- `npm run test` runs the Vitest suite.
- `npm run test:e2e` runs the Playwright browser flow.

## Data model

The committed dataset is generated from the cached Legends source files, centered on:

- `!!config/perks_defs.nut`
- `!!config/perk_strings.nut`
- `afterHooks/perk_to_perk_groups_mapping.nut`
- `config/z_perks_tree_*.nut`
- `config/z_legends_fav_enemies.nut`
- `hooks/skills/backgrounds/*.nut`
- `hooks/scenarios/world/*.nut`

The generated dataset exposes local-reference provenance and perk relations, including:

- `generatedAt`
- `referenceVersion`
- `referenceRoot`
- `sourceFiles`
- `perkCount`
- `treeCount`
- `perks`

Each perk record includes local placement and source information used by the UI, including:

- category membership
- tree placements with tier, descriptors, and attributes
- favored enemy targets
- background dynamic-tree sources
- scenario overlays
- local source file paths

The generated name-mapping snapshot exposes exact local labels for technical ids used by the app, such as perk ids, perk const names, tree ids, scenario ids, background ids, and favored-enemy entity const names.

## Legends source dependency

- The full Legends source tree is not committed in this repo.
- `npm run dev` and `npm run build` automatically ensure the cached GitHub dependency is present.
- The cache lives under `.cache/legends-public/current`, which is `.gitignored`.
- By default the project resolves the latest official GitHub release from `Battle-Brothers-Legends/Legends-public`.
- If you need to pin a specific release locally, set `LEGENDS_REFERENCE_TAG` before running `npm run ensure:legends-reference` or `npm run sync:perks`.

## Icon sources

- Icons are read from the local Battle Brothers archives under the game `data` directory.
- The icon sync is read-only against the game install. It never modifies the installed files.
- If automatic game detection fails, set `BATTLE_BROTHERS_GAME_DIR` to the Battle Brothers install directory before running the sync script.

## Notes

- The browser reads only the committed JSON snapshot at runtime.
- Runtime does not fetch network data.
- The sync and ensure scripts may call the official GitHub API to refresh the cached Legends source dependency.
