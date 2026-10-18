// Native app glue (Capacitor, see capacitor.config.ts): Android's Back button and the status
// bar icon colour. The web build skips all of it.
import { App } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useGame } from './game/store'
import { isNative } from './platform'
import { pressBackArrow } from './ui/BackButton'
import { parseColor } from './ui/sprites'

/** Relative luminance of a '#RRGGBB(AA)' colour. */
function luminance(hex: string) {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const { r, g, b } = parseColor(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function initNative() {
  if (!isNative) return

  // Android Back: closes the menu, else presses the screen's back arrow. Screens without one
  // (mid-round) ignore it, so a stray press can't lose the game; the title screen leaves the app.
  void App.addListener('backButton', () => {
    const s = useGame.getState()
    if (s.transition) return
    if (s.menuOpen) return s.setMenuOpen(false)
    if (pressBackArrow()) return
    if (s.screen === 'LocalVsOnline') void App.minimizeApp()
  })

  // Status bar icons: dark over the light backgrounds, light over the darker pack colours and
  // the open menu. Above ~0.18 luminance black text has the better contrast.
  let darkIcons: boolean | null = null
  const sync = ({ bgColor, menuOpen }: { bgColor: string; menuOpen: boolean }) => {
    const dark = !menuOpen && luminance(bgColor) > 0.18
    if (dark === darkIcons) return
    darkIcons = dark
    void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Light : SystemBarsStyle.Dark })
  }
  sync(useGame.getState())
  useGame.subscribe(sync)
}
