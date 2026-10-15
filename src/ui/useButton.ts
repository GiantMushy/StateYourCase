// Unity Selectable/Button pointer semantics: pressed while held, click on release inside,
// cancelled when the pointer leaves (ButtonDragFix) or moves past the EventSystem drag
// threshold (so scroll gestures don't click). Hover only for mouse pointers.
import { useRef, useState, type PointerEvent } from 'react'

export type ButtonVisual = 'normal' | 'highlighted' | 'pressed' | 'selected' | 'disabled'

/** EventSystem.pixelDragThreshold, in screen pixels. */
const DRAG_THRESHOLD = 10

export interface UseButtonOptions {
  onClick?: () => void
  disabled?: boolean
  /** ToggleButton latch: show the Selected state while true. */
  selected?: boolean
  /** Fires on pointer down instead of release (Unity IPointerDownHandler buttons). */
  onPress?: () => void
}

export function useButton({ onClick, disabled, selected, onPress }: UseButtonOptions) {
  const [pressed, setPressed] = useState(false)
  const [hover, setHover] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)

  const cancel = () => {
    start.current = null
    setPressed(false)
  }

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (disabled || e.button !== 0) return
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      setPressed(true)
      onPress?.()
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > DRAG_THRESHOLD) cancel()
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      cancel()
      if (!disabled) onClick?.()
    },
    onPointerCancel: cancel,
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHover(true)
    },
    onPointerLeave: () => {
      setHover(false)
      if (start.current) cancel()
    },
  }

  const visual: ButtonVisual = disabled
    ? 'disabled'
    : pressed
      ? 'pressed'
      : selected
        ? 'selected'
        : hover
          ? 'highlighted'
          : 'normal'

  return { visual, handlers }
}

/** Animator crossfade durations into each state (Unity AnyState transitions, fixed seconds). */
export type StateDurations = Record<ButtonVisual, number>

export const DEFAULT_DURATIONS: StateDurations = {
  normal: 0.25,
  highlighted: 0.05,
  pressed: 0.05,
  selected: 0.05,
  disabled: 0,
}

/** Hover-in crossfade: Unity's 0.05s linear snap felt stiff, so it eases in over the un-highlight time. */
const HIGHLIGHT_IN = { duration: 0.25, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }

/** CSS transition for a button part entering `visual` (crossfade duration `d`). */
export function buttonTransition(property: string, d: number, visual: ButtonVisual): string {
  if (visual === 'highlighted') return `${property} ${HIGHLIGHT_IN.duration}s ${HIGHLIGHT_IN.easing}`
  return `${property} ${d}s linear`
}
