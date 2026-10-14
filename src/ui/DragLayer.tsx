// Top-level layer for drag ghosts (Unity "DragLayer" RectTransform). Ghosts are portalled
// here so they render above every screen element. Coordinates are stage units from the
// stage's top-left corner.
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DragLayerContext = createContext<HTMLDivElement | null>(null)

export function DragLayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  return (
    <DragLayerContext.Provider value={layer}>
      {children}
      <div ref={setLayer} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </DragLayerContext.Provider>
  )
}

/** Renders children into the drag layer. */
export function DragPortal({ children }: { children: ReactNode }) {
  const layer = useContext(DragLayerContext)
  return layer ? createPortal(children, layer) : null
}

/**
 * A semi-transparent copy of a dragged card, centred on (x, y) in stage units (the Unity
 * ghost's pivot follows the pointer). Pass the card's visuals as children.
 */
export function DragGhost({ x, y, w, h, opacity = 0.75, children }: {
  x: number
  y: number
  w: number
  h: number
  opacity?: number
  children: ReactNode
}) {
  return (
    <DragPortal>
      <div data-drag-ghost style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity, pointerEvents: 'none' }}>
        {children}
      </div>
    </DragPortal>
  )
}

/** Stage-unit rect of an element relative to the stage origin. */
export function stageRect(el: Element, scale: number) {
  const stage = el.closest('.stage')!.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return {
    x: (r.left - stage.left) / scale,
    y: (r.top - stage.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  }
}

/** Stage-unit position of a pointer event. */
export function stagePoint(e: { clientX: number; clientY: number }, stageEl: Element, scale: number) {
  const stage = stageEl.closest('.stage')!.getBoundingClientRect()
  return { x: (e.clientX - stage.left) / scale, y: (e.clientY - stage.top) / scale }
}
