import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const distDirectory = path.join(repositoryRoot, 'dist')
const distAssetsDirectory = path.join(distDirectory, 'assets')
const distIndexPath = path.join(distDirectory, 'index.html')
const netlifyHeadersPath = path.join(distDirectory, '_headers')
const hydrationLoaderPath = path.join(distDirectory, 'hydrate-loader.js')
const sourceAssetUrlPattern = /\/src\/assets\/([^"')\s?#]+)/g
const criticalFontUrlPattern =
  /url\((\/assets\/(?:source-sans-3-latin-400|cinzel-latin-700|source-sans-3-latin-(?:600|700))-normal-[^)]+\.woff2)\)/g
const criticalFontUrlPriorities = [
  'source-sans-3-latin-400',
  'cinzel-latin-700',
  'source-sans-3-latin-600',
  'source-sans-3-latin-700',
]
const prerenderedRootTemplateId = 'battle-brothers-prerendered-root'
const prerenderedRootActivationScript = `(()=>{const root=document.getElementById("root");const template=document.getElementById("${prerenderedRootTemplateId}");if(!root||!(template instanceof HTMLTemplateElement))return;const shouldClientRender=window.location.search!==""||window.location.hash!=="";if(shouldClientRender){document.documentElement.dataset.battleBrothersClientRender="true";document.documentElement.dataset.battleBrothersStaticShellReady="true"}root.append(template.content.cloneNode(true));if(!shouldClientRender)return;const params=new URLSearchParams(window.location.search);const rawBuild=params.get("build");if(!rawBuild)return;const perkNames=rawBuild.split(",").map((perkName)=>perkName.trim()).filter(Boolean);if(perkNames.length===0)return;const optionalPerkNames=new Set((params.get("optional")??"").split(",").map((perkName)=>perkName.trim()).filter(Boolean));const buildPerksBar=root.querySelector('[data-testid="build-perks-bar"]');const buildPlannerCount=root.querySelector('[data-testid="build-planner-count"]');const mustHaveTileTemplate=root.querySelector('[data-testid="planner-requirement-legend-tile"][data-requirement="must-have"]');const optionalTileTemplate=root.querySelector('[data-testid="planner-requirement-legend-tile"][data-requirement="optional"]');if(!buildPerksBar||!mustHaveTileTemplate||!optionalTileTemplate)return;const perkTiles=perkNames.map((perkName)=>{const perkTile=(optionalPerkNames.has(perkName)?optionalTileTemplate:mustHaveTileTemplate).cloneNode(true);perkTile.setAttribute("data-testid","planner-slot-perk");perkTile.setAttribute("data-planner-item","picked-perk");perkTile.removeAttribute("title");const perkNameElement=perkTile.querySelector('[data-testid="planner-picked-perk-name"]');if(perkNameElement)perkNameElement.textContent=perkName;return perkTile});buildPerksBar.replaceChildren(...perkTiles);if(buildPlannerCount)buildPlannerCount.textContent=perkNames.length+" perk"+(perkNames.length===1?"":"s")+" picked.";const sharedGroupsPlaceholder=root.querySelector('[data-testid="build-shared-groups-list"]')?.firstElementChild;if(sharedGroupsPlaceholder)sharedGroupsPlaceholder.style.minHeight="9.3rem"})()`

function escapeStyleText(styleText: string): string {
  return styleText.replaceAll('</style', '<\\/style')
}

function escapeScriptText(scriptText: string): string {
  return scriptText.replaceAll('</script', '<\\/script')
}

function createPrerenderedRootMarkup(appHtml: string): string {
  return [
    '<div id="root"></div>',
    `<template id="${prerenderedRootTemplateId}">${appHtml}</template>`,
    `<script data-battle-brothers-prerendered-root="true">${escapeScriptText(prerenderedRootActivationScript)}</script>`,
  ].join('')
}

function createCriticalFontPreloadTags(stylesheet: string): string {
  const criticalFontUrls = [...stylesheet.matchAll(criticalFontUrlPattern)].map(
    (criticalFontUrlMatch) => criticalFontUrlMatch[1],
  )

  return [...new Set(criticalFontUrls)]
    .toSorted((leftCriticalFontUrl, rightCriticalFontUrl) => {
      const leftPriority = criticalFontUrlPriorities.findIndex((criticalFontUrlPriority) =>
        leftCriticalFontUrl.includes(criticalFontUrlPriority),
      )
      const rightPriority = criticalFontUrlPriorities.findIndex((criticalFontUrlPriority) =>
        rightCriticalFontUrl.includes(criticalFontUrlPriority),
      )

      return leftPriority - rightPriority
    })
    .map(
      (criticalFontUrl) =>
        `<link rel="preload" href="${criticalFontUrl}" as="font" type="font/woff2" crossorigin />`,
    )
    .join('')
}

function createHashSource(text: string): string {
  const hash = createHash('sha256').update(text).digest('base64')

  return `'sha256-${hash}'`
}

function createInlineScriptHashSources(html: string): string[] {
  const inlineScriptPattern = /<script\b(?![^>]*\bsrc=["'])[^>]*>([\s\S]*?)<\/script>/gi
  const inlineScriptHashSources = [...html.matchAll(inlineScriptPattern)].map((inlineScriptMatch) =>
    createHashSource(inlineScriptMatch[1]),
  )

  return [...new Set(inlineScriptHashSources)]
}

function createClientRenderBootScript(entryUrl: string): string {
  return `const hydrationLoaderUrl="/hydrate-loader.js";if(window.location.search!==""||window.location.hash!==""){document.documentElement.dataset.battleBrothersClientRender="true";const link=document.createElement("link");link.rel="modulepreload";link.href=${JSON.stringify(entryUrl)};link.setAttribute("fetchpriority","high");document.head.append(link)}import(hydrationLoaderUrl)`
}

function createEntryModulePreloadTag(entryUrl: string): string {
  return `<link rel="modulepreload" crossorigin href="${entryUrl}" fetchpriority="high">`
}

function createContentSecurityPolicy(styleHashSource: string, scriptHashSources: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashSources.join(' ')}`,
    `style-src 'self' ${styleHashSource}`,
    `style-src-elem 'self' ${styleHashSource}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join('; ')
}

function createNetlifyHeadersFile(styleHashSource: string, scriptHashSources: string[]): string {
  const contentSecurityPolicy = createContentSecurityPolicy(styleHashSource, scriptHashSources)

  return [
    '/*',
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    '  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    `  Content-Security-Policy: ${contentSecurityPolicy}`,
    '',
    '/',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  Netlify-CDN-Cache-Control: public, max-age=300, stale-while-revalidate=3600',
    '',
    '/index.html',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  Netlify-CDN-Cache-Control: public, max-age=300, stale-while-revalidate=3600',
    '',
    '/hydrate-loader.js',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  Netlify-CDN-Cache-Control: public, max-age=300, stale-while-revalidate=3600',
    '',
    '/version.json',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  Netlify-CDN-Cache-Control: no-store',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/game-icons/*',
    '  Cache-Control: public, max-age=604800, stale-while-revalidate=31536000',
    '',
    '/favicon/*',
    '  Cache-Control: public, max-age=604800, stale-while-revalidate=31536000',
    '',
    '/seo/*',
    '  Cache-Control: public, max-age=604800, stale-while-revalidate=31536000',
    '',
    '/social/*',
    '  Cache-Control: public, max-age=604800, stale-while-revalidate=31536000',
    '',
  ].join('\n')
}

function getSingleMatch(html: string, pattern: RegExp, description: string): RegExpExecArray {
  const match = pattern.exec(html)

  if (!match) {
    throw new Error(`Could not find ${description} in built index.html.`)
  }

  return match
}

function createHydrationLoader(entryUrl: string): string {
  return `const entryUrl=${JSON.stringify(entryUrl)};
const manifestLoadDelayMs=8000;
const manifestUrl="/favicon/site.webmanifest";
const hydrationState=window.__battleBrothersHydrationState??={hasStarted:false};
const shouldClientRenderImmediately=window.location.search!==""||window.location.hash!=="";
function appendManifestLink(){
  if (document.querySelector('link[rel="manifest"]')) return;
  const manifestLink=document.createElement("link");
  manifestLink.rel="manifest";
  manifestLink.href=manifestUrl;
  document.head.append(manifestLink);
}
function scheduleManifestLink(){
  window.setTimeout(appendManifestLink,manifestLoadDelayMs);
}
function prepareClientRender(){
  if (!shouldClientRenderImmediately) return;
  document.documentElement.dataset.battleBrothersClientRender="true";
}
function startHydration(){
  if (hydrationState.hasStarted) return;
  hydrationState.hasStarted=true;
  prepareClientRender();
  import(entryUrl);
  scheduleManifestLink();
}
if (hydrationState.hasStarted) {
  scheduleManifestLink();
} else {
  startHydration();
}
`
}

async function readBuiltStylesheets(html: string): Promise<{
  stylesheet: string
  mainStylesheetTag: string
  stylesheetTags: string[]
}> {
  const stylesheetLinkPattern =
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi
  const stylesheetMatches = [...html.matchAll(stylesheetLinkPattern)].map((stylesheetMatch) => ({
    href: stylesheetMatch[1],
    tag: stylesheetMatch[0],
  }))
  const mainStylesheet = stylesheetMatches.find((stylesheetMatch) =>
    /\/assets\/index-[^/]+\.css$/u.test(stylesheetMatch.href),
  )

  if (!mainStylesheet) {
    throw new Error('Could not find main stylesheet link in built index.html.')
  }

  const orderedStylesheetMatches = [
    mainStylesheet,
    ...stylesheetMatches.filter((stylesheetMatch) => stylesheetMatch !== mainStylesheet),
  ]
  const stylesheet = (
    await Promise.all(
      orderedStylesheetMatches.map((stylesheetMatch) =>
        readFile(path.join(distDirectory, stylesheetMatch.href.replace(/^\//, '')), 'utf8'),
      ),
    )
  ).join('\n')

  return {
    mainStylesheetTag: mainStylesheet.tag,
    stylesheet,
    stylesheetTags: stylesheetMatches.map((stylesheetMatch) => stylesheetMatch.tag),
  }
}

function replaceEntryScriptWithEntryModulePreload(html: string): {
  entryUrl: string
  html: string
} {
  const scriptMatch = getSingleMatch(
    html,
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*><\/script>/i,
    'module entry script',
  )
  const entryUrl = scriptMatch[1]
  const entryModulePreloadTag = createEntryModulePreloadTag(entryUrl)

  return {
    entryUrl,
    html: html.replace(scriptMatch[0], entryModulePreloadTag),
  }
}

async function createBuiltAssetUrlBySourceAssetName(): Promise<Map<string, string>> {
  const assetFileNames = await readdir(distAssetsDirectory)
  const builtAssetUrlBySourceAssetName = new Map<string, string>()

  for (const assetFileName of assetFileNames) {
    const extension = path.extname(assetFileName)
    const baseName = path.basename(assetFileName, extension)
    const sourceBaseName = baseName.replace(/-[^-]+$/u, '')

    builtAssetUrlBySourceAssetName.set(`${sourceBaseName}${extension}`, `/assets/${assetFileName}`)
  }

  return builtAssetUrlBySourceAssetName
}

async function replaceServerRenderedAssetUrls(html: string): Promise<string> {
  const builtAssetUrlBySourceAssetName = await createBuiltAssetUrlBySourceAssetName()

  return html.replaceAll(sourceAssetUrlPattern, (sourceAssetUrl, sourceAssetName: string) => {
    return builtAssetUrlBySourceAssetName.get(sourceAssetName) ?? sourceAssetUrl
  })
}

async function prerenderRoot() {
  const viteServer = await createServer({
    appType: 'custom',
    logLevel: 'warn',
    root: repositoryRoot,
    server: {
      middlewareMode: true,
    },
  })

  try {
    const [{ renderAppToHtml }, html] = await Promise.all([
      viteServer.ssrLoadModule('/src/entry-server.tsx'),
      readFile(distIndexPath, 'utf8'),
    ])
    const appHtml = renderAppToHtml()
    const { mainStylesheetTag, stylesheet, stylesheetTags } = await readBuiltStylesheets(html)
    const { entryUrl, html: htmlWithEntryModulePreload } =
      replaceEntryScriptWithEntryModulePreload(html)
    const htmlWithPrerenderedRoot = htmlWithEntryModulePreload.replace(
      '<div id="root"></div>',
      createPrerenderedRootMarkup(appHtml),
    )

    if (htmlWithPrerenderedRoot === htmlWithEntryModulePreload) {
      throw new Error('Could not find root placeholder in built index.html.')
    }

    const htmlWithBuiltAssetUrls = await replaceServerRenderedAssetUrls(htmlWithPrerenderedRoot)
    const criticalFontPreloadTags = createCriticalFontPreloadTags(stylesheet)
    const clientRenderBootScript = createClientRenderBootScript(entryUrl)
    const styleHashSource = createHashSource(stylesheet)
    const inlineCssReplacement = `<script data-battle-brothers-client-render-boot="true">${escapeScriptText(clientRenderBootScript)}</script>${criticalFontPreloadTags}<style data-battle-brothers-inline-css="true">${escapeStyleText(stylesheet)}</style>`
    let htmlWithInlineCss = htmlWithBuiltAssetUrls.replace(mainStylesheetTag, inlineCssReplacement)

    for (const stylesheetTag of stylesheetTags) {
      htmlWithInlineCss = htmlWithInlineCss.replaceAll(stylesheetTag, '')
    }
    const scriptHashSources = createInlineScriptHashSources(htmlWithInlineCss)

    await Promise.all([
      writeFile(distIndexPath, htmlWithInlineCss, 'utf8'),
      writeFile(hydrationLoaderPath, createHydrationLoader(entryUrl), 'utf8'),
      writeFile(
        netlifyHeadersPath,
        createNetlifyHeadersFile(styleHashSource, scriptHashSources),
        'utf8',
      ),
    ])
  } finally {
    await viteServer.close()
  }
}

await prerenderRoot()
