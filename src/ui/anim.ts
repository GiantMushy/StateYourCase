// Frame-loop helpers that reproduce Unity coroutine/Update-style animation timing.
import { useEffect, useRef } from 'react'

/** Calls `cb(dt)` every animation frame (dt in seconds, clamped like Unity's maximumDeltaTime). */
export function useFrame(cb: (dt: number) => void | boolean, active = true) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 3)
      last = now
      if (ref.current(dt) === false) return
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
}

/** Unity `Vector.Lerp(current, target, Time.deltaTime * speed)` step. */
export const lerpStep = (current: number, target: number, speed: number, dt: number) =>
  current + (target - current) * Math.min(1, dt * speed)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3)
export const easeInCubic = (u: number) => u * u * u
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

/** Runs a fixed-duration tween; returns a cancel function. */
export function tween(duration: number, onUpdate: (t: number) => void, onDone?: () => void): () => void {
  let raf = 0
  const start = performance.now()
  const tick = (now: number) => {
    const t = duration <= 0 ? 1 : Math.min(1, (now - start) / 1000 / duration)
    onUpdate(t)
    if (t < 1) raf = requestAnimationFrame(tick)
    else onDone?.()
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export const sleep = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000))
