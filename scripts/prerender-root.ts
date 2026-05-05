import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const distDirectory = path.join(repositoryRoot, 'dist')
const distAssetsDirectory = path.join(distDirectory, 'assets')
const distIndexPath = path.join(distDirectory, 'index.html')
const hydrationLoaderPath = path.join(distDirectory, 'hydrate-loader.js')
const sourceAssetUrlPattern = /\/src\/assets\/([^"')\s?#]+)/g
const criticalFontUrlPattern =
  /url\((\/assets\/(?:cinzel-latin-700|source-sans-3-latin-(?:400|600|700))-normal-[^)]+\.woff2)\)/g

function escapeStyleText(styleText: string): string {
  return styleText.replaceAll('</style', '<\\/style')
}

function createCriticalFontPreloadTags(stylesheet: string): string {
  const criticalFontUrls = [...stylesheet.matchAll(criticalFontUrlPattern)].map(
    (criticalFontUrlMatch) => criticalFontUrlMatch[1],
  )

  return [...new Set(criticalFontUrls)]
    .map(
      (criticalFontUrl) =>
        `<link rel="preload" href="${criticalFontUrl}" as="font" type="font/woff2" crossorigin />`,
    )
    .join('')
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
let hasStartedHydration=false;
let idleHydrationHandle=0;
let automaticHydrationTimeout=0;
const automaticHydrationDelayMs=5000;
const manifestUrl="/favicon/site.webmanifest";
const interactionEvents=["pointerdown","keydown","focusin"];
const listenerOptions={capture:true,passive:true};
const shouldClientRenderImmediately=window.location.search!==""||window.location.hash!=="";
function appendManifestLink(){
  if (document.querySelector('link[rel="manifest"]')) return;
  const manifestLink=document.createElement("link");
  manifestLink.rel="manifest";
  manifestLink.href=manifestUrl;
  document.head.append(manifestLink);
}
function clearInteractionListeners(){
  for (const eventName of interactionEvents) {
    window.removeEventListener(eventName,startHydration,listenerOptions);
  }
}
function prepareClientRender(){
  if (!shouldClientRenderImmediately) return;
  document.getElementById("root")?.replaceChildren();
}
function startHydration(){
  if (hasStartedHydration) return;
  hasStartedHydration=true;
  clearInteractionListeners();
  if (idleHydrationHandle && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(idleHydrationHandle);
  }
  if (automaticHydrationTimeout) {
    window.clearTimeout(automaticHydrationTimeout);
  }
  prepareClientRender();
  import(entryUrl);
  appendManifestLink();
}
function scheduleHydration(){
  automaticHydrationTimeout=window.setTimeout(() => {
    automaticHydrationTimeout=0;
    if ("requestIdleCallback" in window) {
      idleHydrationHandle=window.requestIdleCallback(() => {
        startHydration();
        appendManifestLink();
      },{timeout:2000});
      return;
    }
    startHydration();
    appendManifestLink();
  },automaticHydrationDelayMs);
}
if (shouldClientRenderImmediately) {
  startHydration();
} else {
  for (const eventName of interactionEvents) {
    window.addEventListener(eventName,startHydration,listenerOptions);
  }
  if (document.readyState==="complete") {
    scheduleHydration();
  } else {
    window.addEventListener("load",scheduleHydration,{once:true});
  }
}
`
}

async function readBuiltStylesheet(html: string): Promise<{
  stylesheet: string
  stylesheetTag: string
}> {
  const stylesheetMatch = getSingleMatch(
    html,
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
    'stylesheet link',
  )
  const stylesheetHref = stylesheetMatch[1]
  const stylesheetPath = path.join(distDirectory, stylesheetHref.replace(/^\//, ''))
  const stylesheet = await readFile(stylesheetPath, 'utf8')

  return {
    stylesheet,
    stylesheetTag: stylesheetMatch[0],
  }
}

function replaceEntryScriptWithHydrationLoader(html: string): {
  entryUrl: string
  html: string
} {
  const scriptMatch = getSingleMatch(
    html,
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*><\/script>/i,
    'module entry script',
  )
  const entryUrl = scriptMatch[1]
  const hydrationLoaderTag = '<script type="module" src="/hydrate-loader.js"></script>'

  return {
    entryUrl,
    html: html.replace(scriptMatch[0], hydrationLoaderTag),
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
    const { stylesheet, stylesheetTag } = await readBuiltStylesheet(html)
    const { entryUrl, html: htmlWithHydrationLoader } = replaceEntryScriptWithHydrationLoader(html)
    const htmlWithPrerenderedRoot = htmlWithHydrationLoader.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`,
    )

    if (htmlWithPrerenderedRoot === htmlWithHydrationLoader) {
      throw new Error('Could not find root placeholder in built index.html.')
    }

    const htmlWithBuiltAssetUrls = await replaceServerRenderedAssetUrls(htmlWithPrerenderedRoot)
    const criticalFontPreloadTags = createCriticalFontPreloadTags(stylesheet)
    const htmlWithInlineCss = htmlWithBuiltAssetUrls.replace(
      stylesheetTag,
      `${criticalFontPreloadTags}<style data-battle-brothers-inline-css="true">${escapeStyleText(stylesheet)}</style>`,
    )

    await Promise.all([
      writeFile(distIndexPath, htmlWithInlineCss, 'utf8'),
      writeFile(hydrationLoaderPath, createHydrationLoader(entryUrl), 'utf8'),
    ])
  } finally {
    await viteServer.close()
  }
}

await prerenderRoot()
