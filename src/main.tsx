import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDevFixture } from './dev/fixtures'
import { startTour } from './dev/tour'
import { useGame } from './game/store'
import { initNative } from './native'

initNative()

// Simulator smoke-test builds (VITE_TOUR=1 npm run build) tour every screen; see dev/tour.ts.
if (import.meta.env.VITE_TOUR) {
  startTour()
  applyDevFixture()
}

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
