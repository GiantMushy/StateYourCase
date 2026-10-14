// Unity-style drag gesture for cards (MetricDragHandler / VotingDragHandler / DragHandle):
// a press that stays within 10 device pixels is a click; beyond that it becomes a drag.
// Drop targets are found like a UI raycast: elements under the pointer carrying a
// `data-drop` attribute (closest ancestor wins), ignoring the ghost.
import { useRef, type PointerEvent } from 'react'

/** Unity ClickDistanceThreshold / EventSystem drag threshold, in device pixels. */
const THRESHOLD_DEVICE_PX = 10

export interface DragPoint {
  clientX: number
  clientY: number
}

export interface DragCallbacks {
  onClick?: () => void
  onDragStart?: (p: DragPoint) => void
  onDragMove?: (p: DragPoint) => void
  onDragEnd?: (p: DragPoint) => void
  disabled?: boolean
}

export function useDragGesture(cb: DragCallbacks) {
  const ref = useRef(cb)
  ref.current = cb
  const st = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null)

  const finish = (e: PointerEvent, cancelled: boolean) => {
    const s = st.current
    if (!s || s.id !== e.pointerId) return
    st.current = null
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    if (s.dragging) ref.current.onDragEnd?.(e)
    else if (!cancelled) ref.current.onClick?.()
  }

  return {
    onPointerDown: (e: PointerEvent) => {
      if (ref.current.disabled || e.button !== 0) return
      st.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false }
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    },
    onPointerMove: (e: PointerEvent) => {
      const s = st.current
      if (!s || s.id !== e.pointerId) return
      if (!s.dragging) {
        const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y) * (window.devicePixelRatio || 1)
        if (dist < THRESHOLD_DEVICE_PX) return
        s.dragging = true
        ref.current.onDragStart?.(e)
      }
      ref.current.onDragMove?.(e)
    },
    onPointerUp: (e: PointerEvent) => finish(e, false),
    onPointerCancel: (e: PointerEvent) => finish(e, true),
    style: { touchAction: 'none' as const },
  }
}

/** Returns the `data-drop` value of the topmost drop target under the point, or null. */
export function dropTargetAt(p: DragPoint): string | null {
  for (const el of document.elementsFromPoint(p.clientX, p.clientY)) {
    if ((el as HTMLElement).closest('[data-drag-ghost]')) continue
    const target = (el as HTMLElement).closest<HTMLElement>('[data-drop]')
    if (target) return target.dataset.drop ?? null
  }
  return null
}

/** Stage-unit point (relative to the stage's top-left) for a client point. */
export function toStagePoint(p: DragPoint, anyStageChild: Element) {
  const stage = anyStageChild.closest<HTMLElement>('.stage')!
  const r = stage.getBoundingClientRect()
  const zoom = parseFloat(getComputedStyle(stage).zoom || '1') || 1
  // With CSS zoom, getBoundingClientRect is already in zoomed (client) pixels.
  return { x: (p.clientX - r.left) / zoom, y: (p.clientY - r.top) / zoom }
}
