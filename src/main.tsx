import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDevFixture } from './dev/fixtures'
import { useGame } from './game/store'
import { initNative } from './native'

initNative()

if (import.meta.env.DEV) {
  applyDevFixture()
  // Exposed for the Playwright e2e test.
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
