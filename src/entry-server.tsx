import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

export function renderAppToHtml(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
