// The Unity project renders in *linear* colour space, so semi-transparent UI blends in linear
// light: a 20%-black overlay darkens far less than the same overlay blended in sRGB by the
// browser. We can't change the browser's blend space, but for a given overlay colour we can
// pick the sRGB alpha that produces the same result over the dominant backdrop (the game's
// teal background). Over other backdrops it is a close approximation.
import type { Rgba } from './sprites'

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

/** Default backdrop: the Background Color image (#48CFCB). */
const TEAL: [number, number, number] = [0x48 / 255, 0xcf / 255, 0xcb / 255]
const WEIGHTS = [0.2126, 0.7152, 0.0722]

const cache = new Map<string, number>()

/** sRGB-space alpha equivalent to blending `fg` at `alpha` in linear space over `bg`. */
export function linearAlpha(fg: Pick<Rgba, 'r' | 'g' | 'b'>, alpha: number, bg: readonly [number, number, number] = TEAL): number {
  if (alpha <= 0 || alpha >= 1) return alpha
  const key = `${fg.r.toFixed(3)},${fg.g.toFixed(3)},${fg.b.toFixed(3)},${alpha.toFixed(3)},${bg.join(',')}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const fgc = [fg.r, fg.g, fg.b]
  let num = 0
  let den = 0
  for (let i = 0; i < 3; i++) {
    const target = toSrgb(toLinear(fgc[i]) * alpha + toLinear(bg[i]) * (1 - alpha))
    const diff = fgc[i] - bg[i]
    // Least squares over channels, weighted by perceptual contribution.
    num += WEIGHTS[i] * diff * (target - bg[i])
    den += WEIGHTS[i] * diff * diff
  }
  const result = den < 1e-6 ? alpha : Math.max(0, Math.min(1, num / den))
  cache.set(key, result)
  return result
}
