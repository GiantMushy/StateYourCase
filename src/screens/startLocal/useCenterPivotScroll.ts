// Unity ScrollRect whose Content has pivot (0.5, 0.5) and a ContentSizeFitter: when the
// content resizes it grows/shrinks symmetrically about its centre, and while it is smaller
// than the viewport it stays centred. The viewport is a `.scroll-y` div; the content sits in
// a min-height:100% flex wrapper that centres it (see StartLocalGame).
//
// Call after every render: it measures the content and, when its height changed, moves
// scrollTop so the content centre keeps its place (clamped like the elastic spring-back).
import { useLayoutEffect, useRef, type RefObject } from 'react'

export function useCenterPivotScroll(viewport: RefObject<HTMLDivElement | null>, content: RefObject<HTMLDivElement | null>) {
  const state = useRef<{ height: number; scrollTop: number } | null>(null)

  useLayoutEffect(() => {
    const vp = viewport.current
    const el = content.current
    if (!vp || !el) return
    const view = vp.clientHeight
    const height = el.offsetHeight
    const prev = state.current
    if (prev && prev.height === height) return
    // "Virtual" scrollTop: negative while the content is centred inside a taller viewport.
    let top = prev ? (prev.height > view ? prev.scrollTop : (prev.height - view) / 2) + (height - prev.height) / 2 : (height - view) / 2
    top = Math.max(0, Math.min(height - view, top))
    if (height > view) vp.scrollTop = top
    state.current = { height, scrollTop: vp.scrollTop }
  })

  /** Attach to the viewport's onScroll so user scrolling is remembered (before any clamp). */
  return () => {
    if (state.current && viewport.current) state.current.scrollTop = viewport.current.scrollTop
  }
}
