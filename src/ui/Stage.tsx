// Emulates the Unity CanvasScaler (Scale With Screen Size, 1080x1920, match 0.5). All UI is
// authored in reference units; the stage is sized to the canvas in units and scaled to fit
// the window, so every px value in the codebase is a Unity canvas unit.
//
// Windows wider than the reference phone (iPad, landscape) would give a wider, shorter canvas
// that spreads anchored UI apart and cuts off the bottom of screens. There the canvas is computed
// for a phone-shaped slice of the window (so it is exactly the phone's 979×2118) and centred.
// A screen whose bottom button sits lower than the standard Next asks for a taller, narrower
// canvas on wide windows (`minHeight`), so the button lands at the standard height with the rest
// of its layout scaled down around it. The backdrop and overlay layers (background, transition,
// menu) span the whole window at the phone-shaped scale, so they don't change between screens.
// Phones at least as tall as the reference (390×844, most modern phones) are untouched.
//
// In the native app (Capacitor) the window runs edge to edge: the canvas is laid out in the safe
// area (inside the status bar, navigation bar and display cutout) while the backdrop and overlay
// still cover the whole window. The soft keyboard shrinks the native web view, which would rescale
// the whole UI, so there the layout keeps its size and pans up to keep the focused field visible.
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { nativeLayout } from '../platform'

const REF_W = 1080
const REF_H = 1920
const MATCH = 0.5
/** Viewport of the reference phone captures (iPhone, 390×844 CSS px). */
const PHONE_VIEW = { width: 390, height: 844 }
const PHONE_ASPECT = PHONE_VIEW.width / PHONE_VIEW.height
const PHONE_SCALE = Math.sqrt((PHONE_VIEW.width * PHONE_VIEW.height) / (REF_W * REF_H))
/** Canvas size of the reference phone (≈979×2118 units); a pillarboxed canvas is at least this tall. */
export const PHONE_CANVAS = { width: PHONE_VIEW.width / PHONE_SCALE, height: PHONE_VIEW.height / PHONE_SCALE }

/** Centre y of the standard bottom button (Next / Start / I'm done), from the canvas centre. */
const BOTTOM_BUTTON_Y = -750
/** That button's centre, as a fraction of the screen height from the bottom, on the phone. */
const BOTTOM_BUTTON_FRACTION = (PHONE_CANVAS.height / 2 + BOTTOM_BUTTON_Y) / PHONE_CANVAS.height

/** Canvas height that puts a centre-anchored button at `y` at the standard bottom-button height. */
export const heightForCentreButton = (y: number) => -y / (0.5 - BOTTOM_BUTTON_FRACTION)
/** Canvas height that puts a button whose centre is `fromTop` below the top at the standard height. */
export const heightForTopButton = (fromTop: number) => fromTop / (1 - BOTTOM_BUTTON_FRACTION)

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
const SIDES = ['top', 'right', 'bottom', 'left'] as const

export interface StageMetrics {
  /** Canvas size in reference units. */
  width: number
  height: number
  /** CSS pixels per unit. */
  scale: number
  /** Full safe-area width in reference units (≥ width when pillarboxed). */
  viewWidth: number
  /** CSS pixels between the safe area's left edge and the canvas. */
  offsetX: number
  /** Margins between this layer's edges and the safe area, in units: 0 on the canvas itself. */
  safe: Insets
}

/**
 * `minHeight`: canvas height (units) wanted on wide windows. It eases in as the window gets wider
 * than the phone (fully at 25% wider), so phones are unaffected and resizing never jumps.
 */
function measure(area: { width: number; height: number }, minHeight = PHONE_CANVAS.height): StageMetrics {
  const winW = area.width
  const h = area.height
  const wide = Math.min(1, Math.max(0, (winW / h / PHONE_ASPECT - 1) / 0.25))
  const capHeight = PHONE_CANVAS.height + Math.max(0, minHeight - PHONE_CANVAS.height) * wide
  // Widest aspect whose canvas is `capHeight` tall (canvas height = √(REF_W·REF_H / aspect)).
  const maxAspect = (REF_W * REF_H) / (capHeight * capHeight)
  // Whole CSS pixels when pillarboxed, so the clip edge doesn't leave a sliver of off-canvas UI.
  const w = Math.min(winW, Math.round(h * maxAspect))
  const logW = Math.log2(w / REF_W)
  const logH = Math.log2(h / REF_H)
  const scale = Math.pow(2, logW + (logH - logW) * MATCH)
  return { width: w / scale, height: h / scale, scale, viewWidth: winW / scale, offsetX: Math.floor((winW - w) / 2), safe: NO_INSETS }
}

/** Where the stage lays out, in CSS px. */
interface Viewport {
  /** Window size used for layout (kept while the soft keyboard is up). */
  width: number
  height: number
  /** System bars and display cutout. */
  safe: Insets
  /** Upward shift that keeps the focused field above the keyboard. */
  pan: number
  keyboard: boolean
}

/** Space kept between the focused field and the keyboard, CSS px. */
const KEYBOARD_GAP = 16

let probe: HTMLDivElement | null = null
/**
 * Element padded by the safe-area insets: Capacitor injects `--safe-area-inset-*` on Android,
 * `env()` covers web views that report them natively.
 */
function insetProbe() {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
      SIDES.map((s) => `padding-${s}:var(--safe-area-inset-${s},env(safe-area-inset-${s},0px))`).join(';')
    document.body.append(probe)
  }
  return probe
}

function readInsets(): Insets {
  const style = getComputedStyle(insetProbe())
  const px = (side: (typeof SIDES)[number]) => parseFloat(style.getPropertyValue(`padding-${side}`)) || 0
  return { top: px('top'), right: px('right'), bottom: px('bottom'), left: px('left') }
}

/** `shownPan`: the pan currently on screen, which the field's position includes. */
function nextViewport(prev: Viewport | null, shownPan = 0): Viewport {
  const width = window.innerWidth
  const height = window.innerHeight
  if (!nativeLayout) return { width, height, safe: NO_INSETS, pan: 0, keyboard: false }
  // The app is portrait-only, so the window gets shorter at the same width only for the keyboard.
  // It stays "up" between fields, until the window regains its height.
  const field = document.activeElement?.closest('input, textarea, [contenteditable]')
  const keyboard = !!prev && width === prev.width && height < prev.height && (!!field || prev.keyboard)
  if (!keyboard) return { width, height, safe: readInsets(), pan: 0, keyboard: false }
  let pan = prev.pan
  if (field) {
    const bottom = field.getBoundingClientRect().bottom + shownPan
    pan = Math.min(Math.max(0, bottom + KEYBOARD_GAP - height), prev.height - height)
  }
  return { ...prev, pan, keyboard }
}

const scaled = (insets: Insets, scale: number): Insets => ({
  top: insets.top / scale,
  right: insets.right / scale,
  bottom: insets.bottom / scale,
  left: insets.left / scale,
})

const StageContext = createContext<StageMetrics>({ width: REF_W, height: REF_H, scale: 1, viewWidth: REF_W, offsetX: 0, safe: NO_INSETS })
export const useStage = () => useContext(StageContext)

/**
 * `backdrop` and `overlay` render in window-wide layers at the phone-shaped scale (centred on the
 * canvas), behind and in front of the clipped canvas; inside them `useStage()` reports that
 * phone-shaped canvas, and `safe` the parts of the layer outside the safe area. The overlay layer
 * ignores pointer events; its content opts back in with `pointer-events: auto`.
 */
export function Stage({ backdrop, overlay, minHeight, bleedX, children }: {
  backdrop?: ReactNode
  overlay?: ReactNode
  minHeight?: number
  /** Let the screen draw past the canvas's left/right edges into the side bands (still clipped top/bottom). */
  bleedX?: boolean
  children: ReactNode
}) {
  const [vp, setVp] = useState(() => nextViewport(null))
  // The newest viewport (maybe not rendered yet) and the pan on screen. When the keyboard shows,
  // focus, resize and inset changes arrive in a burst (all at once on iOS); each must build on the
  // one before, and measure the field against the pan actually applied.
  const latest = useRef(vp)
  const shownPan = useRef(vp.pan)
  useLayoutEffect(() => {
    shownPan.current = vp.pan
  }, [vp.pan])
  useLayoutEffect(() => {
    // Computed here rather than in a setVp updater: it reads the DOM, and React may replay updaters.
    const update = () => {
      const next = nextViewport(latest.current, shownPan.current)
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return
      latest.current = next
      setVp(next)
    }
    const events = nativeLayout ? ['resize', 'focusin', 'focusout'] : ['resize']
    for (const e of events) window.addEventListener(e, update)
    if (!nativeLayout) return () => window.removeEventListener('resize', update)
    // The insets arrive (and change) without a resize; the probe's padding box tracks them.
    const insets = new ResizeObserver(update)
    insets.observe(insetProbe(), { box: 'border-box' })
    update()
    // The page never scrolls; keep the web view from scrolling it to a focused field (the pan does that).
    const pin = () => (window.scrollX || window.scrollY) && window.scrollTo(0, 0)
    window.addEventListener('scroll', pin)
    return () => {
      for (const e of events) window.removeEventListener(e, update)
      insets.disconnect()
      window.removeEventListener('scroll', pin)
    }
  }, [])
  const { safe, pan } = vp
  const area = { width: vp.width - safe.left - safe.right, height: vp.height - safe.top - safe.bottom }
  const base = measure(area)
  const m = minHeight ? measure(area, minHeight) : base
  const outer = { ...base, safe: scaled(safe, base.scale) }
  // `zoom` (not transform) so layout happens at device pixels: 9-slice seams and text snap cleanly.
  // A zoomed element's own offsets are zoomed too, so they are in units like its size.
  const layer = { top: -pan / base.scale, width: vp.width / base.scale, height: vp.height / base.scale, zoom: base.scale }
  return (
    <>
      <StageContext.Provider value={outer}>
        {backdrop && (
          <div className="stage-layer" style={layer}>
            {backdrop}
          </div>
        )}
      </StageContext.Provider>
      <StageContext.Provider value={m}>
        <div style={{ position: 'absolute', top: safe.top - pan, left: safe.left + m.offsetX }}>
          <div
            className="stage"
            style={{
              width: m.width,
              height: m.height,
              zoom: m.scale,
              ['--stage-scale' as string]: m.scale,
              ...(bleedX && m.offsetX > 0 && { overflow: 'visible', clipPath: `inset(0 ${-m.offsetX / m.scale}px)` }),
            }}
          >
            {children}
          </div>
        </div>
      </StageContext.Provider>
      <StageContext.Provider value={outer}>
        {overlay && (
          <div className="stage-layer" style={{ ...layer, pointerEvents: 'none' }}>
            {overlay}
          </div>
        )}
      </StageContext.Provider>
    </>
  )
}
