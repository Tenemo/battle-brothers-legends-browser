# Battle Brothers Legends build planner

Battle Brothers Legends build planner is a Vite + React application for exploring the Legends mod perk catalog from a committed local snapshot. The repository contains both the planner itself and the scripts that build its data from Legends source files and Battle Brothers game archives.

At runtime the app is fully static. It reads JSON from `src/data`, images from `public/game-icons`, and does not call GitHub or inspect the local game install while the browser is running. Network access and archive extraction happen only in the sync scripts.

## What this project does

- Browses the Legends perk catalog in a fast client-side UI.
- Searches across perk names, descriptions, perk groups, perk group names, background sources, scenario overlays, and favoured enemy targets.
- Filters by category and perk group.
- Lets you pick perks into a build planner, splits matching perk groups into shared 2-plus-perk coverage and individual-perk coverage, merges identical match sets, and previews picked-perk effects on hover.
- Ranks parsed Legends backgrounds against the current build by exact perk-perk-group fit, separating guaranteed matches from probabilistic matches and showing exact marginal probabilities for non-guaranteed perk groups.
- Persists the current filters and picked build in grouped readable query params so the current setup can be shared or reloaded directly from the URL.
- Serves a centralized static SEO metadata contract for the root app URL, including canonical tags, an Open Graph preview image, JSON-LD, `robots.txt`, and a one-page sitemap.
- Shows exact perk group placement, attribute ranges, dynamic background pool sources, scenario grants, and favoured enemy metadata for the selected perk.
- Uses the actual game icons extracted from a local Battle Brothers install instead of placeholder artwork when the icon sync has been run.
- Keeps the runtime deterministic by committing the generated data snapshot instead of fetching live data in the app.

## Current snapshot

The current committed dataset in this repository contains:

- `367` perks
- `116` perk groups
- `225` parsed source files
- Legends reference version `19.3.17`

These values change whenever `pnpm sync:perks` is run against a newer or different Legends reference.

## Runtime behavior

The main app lives in `src/App.tsx` and imports `src/data/legends-perks.json` directly into the bundle. The UI has five main areas:

- a build planner strip for selected perks, shared perk groups covering 2 or more picked perks, individual-perk group matches, and hover previews
- a collapsible background-fit sidebar that ranks every parsed background against the current build
- a category sidebar with expandable perk groups
- a searchable result list
- a detail panel for the currently selected perk

Search and filtering are fully client-side. The ranking logic in `src/lib/perk-search.ts` prefers exact perk-name matches first, then prefix and substring matches, then perk group names and category names, and finally broader text matches from descriptions and related metadata. When there is no search query, results are sorted by category, perk group, tier, and perk name.

The app also keeps the current search, selected categories, selected perk groups, and picked build in the URL query string. The supported format groups selected values into single params such as `category=Traits,Magic` and `build=Perfect+Focus,Clarity`.

The background-fit sidebar is driven only by the current picked build. It collapses the picked perks into unique perk group targets, treats only the Legends dynamic background categories as matchable (`Weapon`, `Defense`, `Traits`, `Enemy`, `Class`, `Profession`, and `Magic`), and shows unsupported build perk groups such as `Other` separately instead of forcing them into the ranking. Backgrounds are ranked by guaranteed picked-perk coverage first, then total picked-perk coverage, then stable background name and source ordering.

The probability model is exact and deterministic. Explicit perk groups on a background are always guaranteed. `Weapon`, `Defense`, and `Traits` use exact without-replacement fill-to-minimum math. `Enemy` and `Profession` use the same chance-attempt loops as the Legends source. `Magic` only contributes explicit perk groups because the Legends 19.3.17 magic loop does not append random perk groups. `Class` uses the chance-attempt logic plus the parsed class-to-weapon dependency pairs from `config/perks_tree.nut`, so class-perk-group probabilities change when a background can or cannot produce the required weapon perk groups.

The detail panel can show:

- perk descriptions from Legends strings
- perk group placements and tiers
- perk group placements and attribute ranges
- favoured enemy targets and their kill scaling values
- dynamic background perk group sources
- scenario-based grants and random pools

If an icon cannot be found, the UI falls back to a styled placeholder instead of breaking the layout.

## Data pipeline

The committed data files are generated by the scripts in `scripts/`.

`pnpm ensure:legends-reference`:

1. Resolves the latest Legends release from `Battle-Brothers-Legends/Legends-public`, or a pinned tag from `LEGENDS_REFERENCE_TAG`.
2. Downloads the release archive through the GitHub API.
3. Extracts `mod_legends` into `.cache/legends-public/current/mod_legends` and the sibling top-level `scripts` tree into `.cache/legends-public/current/scripts`.
4. Writes `reference-metadata.json` next to the cached reference.
5. Reuses the existing cache if GitHub is unavailable but a valid cached reference already exists.

`pnpm sync:perks`:

1. Refreshes the cached Legends reference.
2. Parses the relevant Squirrel files from that reference.
3. Rewrites `src/data/legends-perks.json`.
4. Syncs only the icon files referenced by the dataset into `public/game-icons`.

`pnpm sync:icons`:

1. Reads the already generated dataset.
2. Collects all perk and perk group icon paths referenced by that dataset.
3. Scans the local Battle Brothers archives for matching `gfx/...` entries.
4. Extracts only the required files into a staging directory.
5. Replaces `public/game-icons` with the staged result.

The importer in `scripts/legends-perks-importer.mjs` is tailored to the parts of the Legends Squirrel source tree this project needs. It parses:

- `!!config/perks_defs.nut`
- `!!config/perk_strings.nut`
- `hooks/config/perk_strings.nut`
- `!!config/_global.nut`
- `!!config/character_backgrounds.nut`
- `afterHooks/perk_to_perk_groups_mapping.nut`
- `config/perks_tree.nut`
- `config/z_perks_tree_*.nut`
- `config/z_legends_fav_enemies.nut`
- `hooks/skills/backgrounds/*.nut`
- `scripts/skills/backgrounds/*.nut`
- `hooks/scenarios/world/*.nut`
- player-background acquisition references from the active `::Const.Character...` arrays plus the relevant hook/script scenario, event, and settlement-building files

From those files it builds a dataset with:

- source provenance
- perk definitions and descriptions
- category and perk group placement
- background dynamic-perk-group sources for all currently playable backgrounds the app can resolve from the Legends source
- aggregated background-fit definitions and class-to-weapon dependency rules
- scenario overlay and direct-grant data
- favoured enemy targets and scaling values

## Generated files

The generated artifacts that the runtime actually uses are:

- `src/data/legends-perks.json`
  This is the main dataset consumed by the app. It includes metadata such as `generatedAt`, `referenceVersion`, `referenceRoot`, `sourceFiles`, `perkCount`, `perkGroupCount`, and the full `perks` array.
- `public/game-icons/**`
  These are the extracted icon files served by Vite at runtime.
- `public/favicon/**`
  These are the committed student-icon favicon assets and manifest served across desktop browsers, iOS home-screen shortcuts, and installed web apps.
- `public/seo/og-image-v2.png`
  This is the generated social preview image used by the Open Graph and Twitter card metadata. It is ignored by Git and written deterministically by `pnpm run generate:social-image`, which runs before local dev servers and production builds.
- `src/lib/seo-metadata.ts`
  This is the shared root SEO contract used by Vite to render the served and built HTML metadata.
- `public/robots.txt`
  This declares crawl access and points search engines at the sitemap.
- `public/sitemap.xml`
  This lists the single canonical root URL for the current static app.

## Requirements

To work on the project comfortably you need:

- Node.js 24.14.1 or newer
- `pnpm`
- `tar` available on `PATH`
- network access to GitHub if you need to populate or refresh the cached Legends reference
- a local Battle Brothers install if you want to resync icons

The built application itself does not need network access. Normal dev and build commands use the committed dataset and icons, and only regenerate the deterministic social preview image. Refreshing the Legends source cache and generated dataset is explicit through `pnpm sync:perks`.

## Quick start

Install dependencies and start the local app:

```bash
pnpm install
pnpm dev
```

`pnpm install` also runs `pnpm prepare`, which wires the local Husky Git hooks. The committed pre-commit hook runs linting, typechecking, unit tests, and the production build before each commit. End-to-end tests stay outside pre-commit and are still available through `pnpm test:e2e`.

Useful follow-up commands:

- `pnpm build` builds the production bundle.
- `pnpm build:netlify` builds the production bundle without refreshing the cached Legends reference first. This is the command used by Netlify because deployment only needs the committed dataset and icons.
- `pnpm generate:social-image` regenerates `public/seo/og-image-v2.png`.
- `pnpm preview` serves the built bundle locally.
- `pnpm test` runs the Vitest suite.
- `pnpm test:e2e` runs the Playwright browser suite.

If the Legends cache does not exist yet, run `pnpm sync:perks` when you intentionally want to refresh the committed dataset from the latest or pinned Legends reference.

## Environment variables

The scripts support a small number of overrides:

- `LEGENDS_REFERENCE_TAG`
  Pins the Legends source dependency to a specific release tag instead of the latest release.
- `BATTLE_BROTHERS_GAME_DIR`
  Points directly to the Battle Brothers installation directory. The directory must contain the game `data` folder.
- `BATTLE_BROTHERS_STEAM_ROOT`
  Overrides the Steam root used when auto-discovering Steam library folders.

PowerShell examples:

```powershell
$env:LEGENDS_REFERENCE_TAG = "19.3.16"
pnpm ensure:legends-reference
```

```powershell
$env:BATTLE_BROTHERS_GAME_DIR = "C:\Program Files (x86)\Steam\steamapps\common\Battle Brothers"
pnpm sync:icons
```

## Netlify deployment

The repository now includes a root `netlify.toml` tailored for this app.

- Netlify builds use `pnpm build:netlify`.
- The published directory is `dist`.
- The config pins Netlify to Node.js `24.14.1`.
- `netlify dev` proxies to the local Vite server on port `5173`.
- Security headers are based on the stricter style used in `Tenemo/piech.dev`, but simplified for this app's static Vite output.
- Cache headers keep `index.html` fresh while allowing long-lived caching for hashed Vite assets and shorter caching for synced game icons.

`build:netlify` intentionally skips `prebuild`. The deployed app only reads committed JSON and committed icon assets, so refreshing the Legends cache during every Netlify build would add a network dependency without changing the generated site.
It still regenerates the deterministic root social preview image before building so a clean deploy has the expected SEO asset. Shared build URLs use a Netlify function to render their path-keyed PNG preview images from the committed dataset and icon assets.

## Available scripts

- `pnpm dev`
  Starts the Vite development server. Because of `predev`, it first regenerates the deterministic social preview image.
- `pnpm build`
  Runs `pnpm tsc` and creates the production bundle. Because of `prebuild`, it first regenerates the deterministic social preview image.
- `pnpm build:netlify`
  Runs the same production build as `pnpm build`, then builds the Netlify edge function manifest and packages the shared build social image function. Use this for Netlify deployments.
- `pnpm generate:social-image`
  Regenerates the ignored Open Graph and Twitter card preview image from local assets.
- `pnpm format`
  Formats supported project files with Prettier.
- `pnpm format:check`
  Checks supported project files with Prettier without rewriting them.
- `pnpm knip`
  Runs the tuned Knip report for unused files, exports, and dependencies.
- `pnpm knip:production`
  Runs Knip in production mode to focus on production entry points and dependencies.
- `pnpm preview`
  Serves the built application locally.
- `pnpm prepare`
  Installs Husky hooks for the local checkout.
- `pnpm lint`
  Alias for the repository ESLint run.
- `pnpm typecheck`
  Alias for the TypeScript project build check.
- `pnpm tsc`
  Runs the TypeScript project build check with `tsc -b`.
- `pnpm eslint`
  Runs ESLint across the repository.
- `pnpm eslint:fix`
  Runs ESLint with automatic fixes where possible.
- `pnpm test`
  Runs the Vitest test suite in `tests/**/*.test.ts` and `tests/**/*.test.tsx`.
- `pnpm test:e2e`
  Runs the Playwright browser suite. The Playwright config starts the dedicated `pnpm run dev:test` server on port `4173`, with a Windows-specific `pnpm.cmd` fallback for local command resolution.
- `pnpm ensure:legends-reference`
  Downloads or refreshes the cached Legends source dependency under `.cache/legends-public/current`.
- `pnpm sync:icons`
  Resyncs the icon subset from the local Battle Brothers archives into `public/game-icons`.
- `pnpm sync:perks`
  Regenerates the committed dataset, then resyncs icons.

## Repository layout

- `src/App.tsx`
  The browser UI shell, dataset state, URL synchronization, filters, and shared hover coordination.
- `src/components/`
  Feature components for the build planner, background-fit panel, perk results, detail panel, and shared controls.
- `src/lib/perk-search.ts`
  Client-side search ranking, filtering, tier labeling, and perk preview selection.
- `src/lib/perk-browser-url-state.ts`
  Grouped readable query-string parsing and serialization for shared filter and build state.
- `src/lib/build-planner.ts`
  Build-planner helpers for deduping perk-group options, grouping perk coverage across the current build, and formatting grouped labels.
- `src/types/legends-perks.ts`
  Shared TypeScript types for the generated dataset.
- `src/data/`
  Committed generated JSON snapshots consumed by the UI.
- `public/game-icons/`
  Extracted icon assets copied from the local game archives.
- `scripts/ensure-legends-reference.mjs`
  GitHub release download and local cache management.
- `scripts/legends-perks-importer.mjs`
  Dataset generation from the cached Legends Squirrel files.
- `scripts/legends-icon-sync.mjs`
  Selective icon extraction from local Battle Brothers archives.
- `scripts/squirrel-subset-parser.mjs`
  The Squirrel parser primitives used by the importer.
- `tests/fixtures/legends-reference/`
  A fixture Legends source tree used by importer tests.
- `tests/`
  Unit and integration tests for the UI and the data pipeline.
- `tests/e2e/`
  Playwright end-to-end coverage for the browser workflow.

## Testing and verification

The repository already includes coverage for the main moving parts:

- importer parsing for placements, backgrounds, and scenarios
- icon-path collection and extraction planning
- search ranking and filter combinations
- app rendering and selection behavior
- Playwright end-to-end browsing flows

Common verification commands:

```bash
pnpm tsc
pnpm eslint
pnpm build
pnpm test
pnpm test:e2e
```

## Troubleshooting

- `Unable to resolve the Legends release ...`
  GitHub could not be reached or returned an error. If a cached reference already exists, the scripts will reuse it. On a fresh checkout you need working GitHub access at least once.
- `Unable to find a local Battle Brothers install ...`
  Set `BATTLE_BROTHERS_GAME_DIR` to the Battle Brothers installation directory before running `pnpm sync:icons` or `pnpm sync:perks`.
- `No readable Battle Brothers archives were found ...`
  Check that the selected game directory contains the usual `data` archives from the installed game.
- Missing icon warnings during sync
  The dataset references icon paths that were not found in the detected archives. The app will still run, but those entries will render placeholders until the referenced assets exist locally.
- Offline work on a clean checkout
  The runtime data is committed, and normal dev/build commands do not need the Legends cache. Populate `.cache/legends-public/current` only before running sync scripts that refresh the dataset.
