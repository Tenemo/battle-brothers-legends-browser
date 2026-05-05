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

function createStyleHashSource(styleText: string): string {
  const hash = createHash('sha256').update(styleText).digest('base64')

  return `'sha256-${hash}'`
}

function createContentSecurityPolicy(styleHashSource: string): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    `style-src 'self' ${styleHashSource}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join('; ')
}

function createNetlifyHeadersFile(styleHashSource: string): string {
  const contentSecurityPolicy = createContentSecurityPolicy(styleHashSource)

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
    const styleHashSource = createStyleHashSource(stylesheet)
    const htmlWithInlineCss = htmlWithBuiltAssetUrls.replace(
      stylesheetTag,
      `${criticalFontPreloadTags}<style data-battle-brothers-inline-css="true">${escapeStyleText(stylesheet)}</style>`,
    )

    await Promise.all([
      writeFile(distIndexPath, htmlWithInlineCss, 'utf8'),
      writeFile(hydrationLoaderPath, createHydrationLoader(entryUrl), 'utf8'),
      writeFile(netlifyHeadersPath, createNetlifyHeadersFile(styleHashSource), 'utf8'),
    ])
  } finally {
    await viteServer.close()
  }
}

await prerenderRoot()
