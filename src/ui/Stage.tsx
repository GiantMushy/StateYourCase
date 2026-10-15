// Emulates the Unity CanvasScaler (Scale With Screen Size, 1080x1920, match 0.5). All UI is
// authored in reference units; the stage is sized to the canvas in units and scaled to fit
// the window, so every px value in the codebase is a Unity canvas unit.
//
// Windows wider than the 9:16 reference (iPad, landscape) would give a wide, short canvas that
// spreads anchored UI apart and cuts off the bottom of screens. There the canvas is computed
// for a 9:16 slice of the window and centred; the backdrop layer still spans the whole window
// so the side bands show the background, window-wide fills portal into `useStageOverlay`, and
// the `overlay` (side menu) is anchored to the window rather than the canvas.
// Phones (narrower than 9:16) are untouched.
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const REF_W = 1080
const REF_H = 1920
const MATCH = 0.5
/** Widest canvas aspect (width / height); wider windows are pillarboxed. */
const MAX_ASPECT = REF_W / REF_H
/** Canvas size of the reference phone captures (390×844), for matching the phone look on iPad. */
export const PHONE_CANVAS = { width: 979, height: 2118 }

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

function measure(): StageMetrics {
  const winW = window.innerWidth
  const h = window.innerHeight
  // Whole CSS pixels when pillarboxed, so the clip edge doesn't leave a sliver of off-canvas UI.
  const w = Math.min(winW, Math.round(h * MAX_ASPECT))
  const logW = Math.log2(w / REF_W)
  const logH = Math.log2(h / REF_H)
  const scale = Math.pow(2, logW + (logH - logW) * MATCH)
  return { width: w / scale, height: h / scale, scale, viewWidth: winW / scale, offsetX: Math.floor((winW - w) / 2) }
}

const StageContext = createContext<StageMetrics>({ width: REF_W, height: REF_H, scale: 1, viewWidth: REF_W, offsetX: 0 })
export const useStage = () => useContext(StageContext)

const OverlayContext = createContext<HTMLDivElement | null>(null)
/** Window-wide layer (stage units, above the canvas, below `overlay`) for portalling side-band fills. */
export const useStageOverlay = () => useContext(OverlayContext)

/**
 * `backdrop` and `overlay` render in window-wide layers (same scale, centred on the canvas)
 * behind and in front of the clipped canvas. The overlay layer ignores pointer events; its
 * content opts back in with `pointer-events: auto`.
 */
export function Stage({ backdrop, overlay: overlayContent, children }: { backdrop?: ReactNode; overlay?: ReactNode; children: ReactNode }) {
  const [m, setM] = useState(measure)
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const onResize = () => setM(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // `zoom` (not transform) so layout happens at device pixels: 9-slice seams and text snap cleanly.
  const layer = { width: m.viewWidth, height: m.height, zoom: m.scale }
  return (
    <StageContext.Provider value={m}>
      <OverlayContext.Provider value={overlay}>
        {backdrop && (
          <div className="stage-layer" style={layer}>
            {backdrop}
          </div>
        )}
        <div style={{ position: 'absolute', top: 0, left: m.offsetX }}>
          <div className="stage" style={{ width: m.width, height: m.height, zoom: m.scale, ['--stage-scale' as string]: m.scale }}>
            {children}
          </div>
        </div>
        <div className="stage-layer" style={{ ...layer, pointerEvents: 'none' }} ref={setOverlay} />
        {overlayContent && (
          <div className="stage-layer" style={{ ...layer, pointerEvents: 'none' }}>
            {overlayContent}
          </div>
        )}
      </OverlayContext.Provider>
    </StageContext.Provider>
  )
}
