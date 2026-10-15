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
import { createContext, useContext, useLayoutEffect, useReducer, type ReactNode } from 'react'

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

export interface StageMetrics {
  /** Canvas size in reference units. */
  width: number
  height: number
  /** CSS pixels per unit. */
  scale: number
  /** Full window width in reference units (≥ width when pillarboxed). */
  viewWidth: number
  /** CSS pixels between the window's left edge and the canvas. */
  offsetX: number
}

/**
 * `minHeight`: canvas height (units) wanted on wide windows. It eases in as the window gets wider
 * than the phone (fully at 25% wider), so phones are unaffected and resizing never jumps.
 */
function measure(minHeight = PHONE_CANVAS.height): StageMetrics {
  const winW = window.innerWidth
  const h = window.innerHeight
  const wide = Math.min(1, Math.max(0, (winW / h / PHONE_ASPECT - 1) / 0.25))
  const capHeight = PHONE_CANVAS.height + Math.max(0, minHeight - PHONE_CANVAS.height) * wide
  // Widest aspect whose canvas is `capHeight` tall (canvas height = √(REF_W·REF_H / aspect)).
  const maxAspect = (REF_W * REF_H) / (capHeight * capHeight)
  // Whole CSS pixels when pillarboxed, so the clip edge doesn't leave a sliver of off-canvas UI.
  const w = Math.min(winW, Math.round(h * maxAspect))
  const logW = Math.log2(w / REF_W)
  const logH = Math.log2(h / REF_H)
  const scale = Math.pow(2, logW + (logH - logW) * MATCH)
  return { width: w / scale, height: h / scale, scale, viewWidth: winW / scale, offsetX: Math.floor((winW - w) / 2) }
}

const StageContext = createContext<StageMetrics>({ width: REF_W, height: REF_H, scale: 1, viewWidth: REF_W, offsetX: 0 })
export const useStage = () => useContext(StageContext)

/**
 * `backdrop` and `overlay` render in window-wide layers at the phone-shaped scale (centred on the
 * canvas), behind and in front of the clipped canvas; inside them `useStage()` reports that
 * phone-shaped canvas. The overlay layer ignores pointer events; its content opts back in with
 * `pointer-events: auto`.
 */
export function Stage({ backdrop, overlay, minHeight, bleedX, children }: {
  backdrop?: ReactNode
  overlay?: ReactNode
  minHeight?: number
  /** Let the screen draw past the canvas's left/right edges into the side bands (still clipped top/bottom). */
  bleedX?: boolean
  children: ReactNode
}) {
  const [, onResize] = useReducer((n: number) => n + 1, 0)
  useLayoutEffect(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const base = measure()
  const m = minHeight ? measure(minHeight) : base
  // `zoom` (not transform) so layout happens at device pixels: 9-slice seams and text snap cleanly.
  const layer = { width: base.viewWidth, height: base.height, zoom: base.scale }
  return (
    <>
      <StageContext.Provider value={base}>
        {backdrop && (
          <div className="stage-layer" style={layer}>
            {backdrop}
          </div>
        )}
      </StageContext.Provider>
      <StageContext.Provider value={m}>
        <div style={{ position: 'absolute', top: 0, left: m.offsetX }}>
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
      <StageContext.Provider value={base}>
        {overlay && (
          <div className="stage-layer" style={{ ...layer, pointerEvents: 'none' }}>
            {overlay}
          </div>
        )}
      </StageContext.Provider>
    </>
  )
}
