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
}

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  const root = createRoot(rootElement)

  if (shouldRevealClientRenderedRoot) {
    flushSync(() => {
      root.render(app)
    })
  } else {
    root.render(app)
  }
}

markClientRenderedRootReady()
