// CSS versions of Unity's flat button sprites, shared by the 3D buttons (Button3D, CassettButton).
// The sprites are single-colour rounded rectangles with circular corners as big as their 9-slice
// border: "Square" 78 px, "Sharp" 40 px. Their outlines are 16 px rings, and the raised variants
// ("Button Border Square/Sharp") add a 16 px lip below at 75% brightness. Drawn as CSS borders and
// shadows they stay crisp and aligned on every screen size, unlike stacked 9-slice bitmaps whose
// edges could drift a device pixel apart (a light line under the outline on some iPhones).
import { linearAlpha } from './linearBlend'
import { parseColor } from './sprites'

/** Corner radius in sprite px. */
export const CORNER = { Square: 78, Sharp: 40 }
/** Ring and lip thickness in sprite px. */
export const RING = 16
export const LIP = 16
/** Lip pixels are 192/255 grey before tinting. */
export const LIP_SHADE = 192 / 255

/** Canvas units per sprite px, as Unity scaled the 9-slice (sprite PPU × pixelsPerUnitMultiplier). */
export const spriteUnit = (spritePpu: number, ppu: number) => 100 / (spritePpu * ppu)

/**
 * Push down over ~7 frames (ease-out quad, so the travel is visible rather than front-loaded),
 * settle back a little slower (ease-out cubic); hover (mouse only) eases.
 */
export const PRESS = { ms: 120, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
export const RELEASE = { ms: 180, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' }
export const HOVER = { ms: 250, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }

/** Transform transition for a cap that is (or is not) pressed. */
export const capTransition = (down: boolean) => {
  const m = down ? PRESS : RELEASE
  return `transform ${m.ms}ms ${m.easing}`
}

/**
 * Unity colour as CSS: RGB optionally shaded like a grey sprite pixel (clamped), alpha optionally
 * scaled, and converted so it blends like Unity's linear colour space (see linearBlend.ts).
 */
export function cssColor(hex: string, shade = 1, opacity = 1) {
  const c = parseColor(hex)
  const ch = (v: number) => Math.min(255, v * shade * 255)
  return `rgba(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}, ${linearAlpha(c, c.a * opacity)})`
}
