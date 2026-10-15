// Unity "Sliced" image drawn into a canvas at device resolution. CSS border-image draws the nine
// pieces as separate anti-aliased quads, which leaves hairline cracks between them whenever the
// element is scaled, moved by a sub-pixel amount, or resized mid-animation. Here the slice
// boundaries are snapped to whole device pixels, so the pieces always abut exactly.
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { spriteInfo, tintedSpriteSource } from './sprites'

export interface SlicedCanvasProps {
  sprite: string
  color: string
  /** Canvas units per sprite pixel for the borders (100 / (spritePPU × pixelsPerUnitMultiplier)). */
  unit: number
  style: CSSProperties
  className?: string
}

/** Splits `total` device px into [start, middle, end] like Unity: borders shrink proportionally if they don't fit. */
function splitAxis(total: number, a: number, b: number): [number, number, number] {
  let s = Math.round(a)
  let e = Math.round(b)
  if (s + e > total) {
    const f = total / (a + b)
    s = Math.floor(a * f)
    e = total - s
  }
  return [s, total - s - e, e]
}

function draw(canvas: HTMLCanvasElement, sprite: string, color: string, unit: number) {
  const rect = canvas.getBoundingClientRect()
  const layoutW = canvas.offsetWidth
  const layoutH = canvas.offsetHeight
  if (!layoutW || !layoutH || !rect.width || !rect.height) return
  const dpr = window.devicePixelRatio || 1
  const W = Math.max(1, Math.round(rect.width * dpr))
  const H = Math.max(1, Math.round(rect.height * dpr))
  const source = tintedSpriteSource(sprite, color)
  if (!source) return
  if (canvas.width !== W) canvas.width = W
  if (canvas.height !== H) canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)

  const info = spriteInfo(sprite)
  const [l, b, r, t] = info.border
  const kx = W / layoutW
  const ky = H / layoutH
  const [dl, dmx, dr] = splitAxis(W, l * unit * kx, r * unit * kx)
  const [dt, dmy, db] = splitAxis(H, t * unit * ky, b * unit * ky)
  const sx = [0, l, info.w - r]
  const sw = [l, info.w - l - r, r]
  const sy = [0, t, info.h - b]
  const sh = [t, info.h - t - b, b]
  const dx = [0, dl, dl + dmx]
  const dw = [dl, dmx, dr]
  const dy = [0, dt, dt + dmy]
  const dh = [dt, dmy, db]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      if (sw[i] <= 0 || sh[j] <= 0 || dw[i] <= 0 || dh[j] <= 0) continue
      ctx.drawImage(source, sx[i], sy[j], sw[i], sh[j], dx[i], dy[j], dw[i], dh[j])
    }
}

export function SlicedCanvas({ sprite, color, unit, style, className }: SlicedCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    const redraw = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        draw(canvas, sprite, color, unit)
      })
    }
    draw(canvas, sprite, color, unit)
    // Layout size changes (press animations, autosized containers) trigger a redraw.
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    window.addEventListener('resize', redraw)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', redraw)
      cancelAnimationFrame(raf)
    }
  }, [sprite, color, unit])

  return <canvas ref={ref} className={className} style={{ display: 'block', ...style }} />
}
