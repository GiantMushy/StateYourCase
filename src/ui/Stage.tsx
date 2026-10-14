// Emulates the Unity CanvasScaler (Scale With Screen Size, 1080x1920, match 0.5). All UI is
// authored in reference units; the stage is sized to the canvas in units and scaled to fit
// the window, so every px value in the codebase is a Unity canvas unit.
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const REF_W = 1080
const REF_H = 1920
const MATCH = 0.5

export interface StageMetrics {
  /** Canvas size in reference units. */
  width: number
  height: number
  /** CSS pixels per unit. */
  scale: number
}

function measure(): StageMetrics {
  const w = window.innerWidth
  const h = window.innerHeight
  const logW = Math.log2(w / REF_W)
  const logH = Math.log2(h / REF_H)
  const scale = Math.pow(2, logW + (logH - logW) * MATCH)
  return { width: w / scale, height: h / scale, scale }
}

const StageContext = createContext<StageMetrics>({ width: REF_W, height: REF_H, scale: 1 })
export const useStage = () => useContext(StageContext)

export function Stage({ children }: { children: ReactNode }) {
  const [m, setM] = useState(measure)
  useLayoutEffect(() => {
    const onResize = () => setM(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <StageContext.Provider value={m}>
      <div
        className="stage"
        // `zoom` (not transform) so layout happens at device pixels: 9-slice seams and text snap cleanly.
        style={{ width: m.width, height: m.height, zoom: m.scale, ['--stage-scale' as string]: m.scale }}
      >
        {children}
      </div>
    </StageContext.Provider>
  )
}

/** Converts a client-space pointer position into stage units. */
export function toStage(clientX: number, clientY: number, scale: number) {
  return { x: clientX / scale, y: clientY / scale }
}
