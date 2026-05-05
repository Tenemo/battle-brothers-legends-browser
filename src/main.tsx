import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.scss'
import './styles/tokens.scss'
import App from './App.tsx'

const rootElement = document.getElementById('root')!
const documentElement = document.documentElement
const shouldRevealClientRenderedRoot = documentElement.dataset.battleBrothersClientRender === 'true'
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

function markClientRenderedRootReady() {
  if (!shouldRevealClientRenderedRoot) {
    return
  }

  documentElement.dataset.battleBrothersClientRenderReady = 'true'
  delete documentElement.dataset.battleBrothersStaticShellReady
}

if (rootElement.hasChildNodes() && !shouldRevealClientRenderedRoot) {
  hydrateRoot(rootElement, app)
} else {
  const shouldReplaceStaticShell = shouldRevealClientRenderedRoot && rootElement.hasChildNodes()
  const renderContainer = shouldReplaceStaticShell ? document.createElement('div') : rootElement

  if (shouldReplaceStaticShell) {
    renderContainer.style.position = 'absolute'
    renderContainer.style.inset = '0'
    renderContainer.style.width = '100%'
    renderContainer.style.visibility = 'hidden'
    rootElement.append(renderContainer)
  }

  const root = createRoot(renderContainer)

  if (shouldRevealClientRenderedRoot) {
    flushSync(() => {
      root.render(app)
    })

    if (shouldReplaceStaticShell) {
      renderContainer.style.visibility = ''
      rootElement.replaceChildren(renderContainer)
      renderContainer.style.position = ''
      renderContainer.style.inset = ''
      renderContainer.style.width = ''
    }
  } else {
    root.render(app)
  }
}

markClientRenderedRootReady()
