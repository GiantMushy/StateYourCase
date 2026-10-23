// Screen tour for simulator smoke tests (builds made with VITE_TOUR=1, never shipped): opens
// each fixture screen in turn (see fixtures.ts), then holds its last 3D button pressed, logging
// "[tour] <step> <name> shown|pressed" so a script can screenshot each state, and "[tour] done".
// Each step reloads the page, so every screen starts from a fresh app like a real visit.
import { useGame } from '../game/store'

const STEPS: { name: string; query: string; menu?: boolean }[] = [
  { name: 'title', query: '' },
  { name: 'menu', query: '', menu: true },
  { name: 'packs', query: 'screen=PackSelection' },
  { name: 'names', query: 'screen=StartLocalGame' },
  { name: 'groups', query: 'screen=AssignGroups' },
  { name: 'mutex', query: 'screen=PlayerMutex&mutex=Anna' },
  { name: 'topic', query: 'screen=TopicSelection' },
  { name: 'metrics', query: 'screen=MetricSelection' },
  { name: 'positions', query: 'screen=AssignPositions' },
  { name: 'corruption', query: 'screen=CorruptionDisplay' },
  { name: 'debate', query: 'screen=DMDisplay' },
  { name: 'debate-wide', query: 'screen=DMDisplay&wide=1' },
  { name: 'voting', query: 'screen=Voting&groups=4' },
  { name: 'scoreboard', query: 'screen=Scoreboard&round=2' },
  { name: 'metrics-is', query: 'screen=MetricSelection&lang=is' },
]

const KEY = 'tourStep'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Points this page load at the current step's fixture; call before applyDevFixture(). */
export function startTour() {
  const step = Number(sessionStorage.getItem(KEY) ?? 0)
  const s = STEPS[step]
  if (!s) {
    console.log('[tour] done')
    return
  }
  history.replaceState(null, '', `${location.pathname}${s.query ? `?${s.query}` : ''}`)
  void run(step, s)
}

async function run(step: number, s: (typeof STEPS)[number]) {
  await document.fonts.ready
  // The game draws once its sprites have loaded, which can take seconds on a simulator's first boot.
  for (let t = 0; t < 15000 && !document.querySelector('.stage'); t += 100) await wait(100)
  await wait(1800)
  if (s.menu) {
    useGame.getState().setMenuOpen(true)
    await wait(1200)
  }
  console.log(`[tour] ${step} ${s.name} shown`)
  await wait(900)
  const button = [...document.querySelectorAll('[data-button3d]')].pop()
  if (button && !s.menu) {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 99, pointerType: 'touch', isPrimary: true }))
    await wait(400)
    console.log(`[tour] ${step} ${s.name} pressed`)
    await wait(900)
    button.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 99, pointerType: 'touch', isPrimary: true }))
  }
  sessionStorage.setItem(KEY, String(step + 1))
  location.reload()
}
