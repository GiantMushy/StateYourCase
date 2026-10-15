// Sprite registry + Unity-style colour tinting. Unity multiplies an Image's colour into its
// sprite; CSS can't, so tinted variants are generated once on a canvas and cached as
// object URLs. Alpha is NOT baked in — it's applied as CSS opacity on the leaf element.
import manifest from '../assets/spriteManifest.json'

export interface SpriteInfo {
  file: string
  w: number
  h: number
  ppu: number
  /** Unity order: left, bottom, right, top (sprite pixels). */
  border: [number, number, number, number]
}

const SPRITES = manifest as unknown as Record<string, SpriteInfo>

export function spriteInfo(name: string): SpriteInfo {
  const s = SPRITES[name]
  if (!s) throw new Error(`Unknown sprite "${name}"`)
  return s
}

export const spriteUrl = (name: string) => `${import.meta.env.BASE_URL}sprites/${encodeURIComponent(spriteInfo(name).file)}`

const images = new Map<string, HTMLImageElement>()

/** Loads and decodes every sprite so tinting can run synchronously during render. */
export function preloadSprites(): Promise<void> {
  return Promise.all(
    Object.keys(SPRITES).map(
      (name) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = img.onerror = () => resolve()
          img.src = spriteUrl(name)
          images.set(name, img)
        }),
    ),
  ).then(() => undefined)
}

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** Parses '#RRGGBB' or '#RRGGBBAA' (Unity ToHtmlStringRGBA format). */
export function parseColor(hex: string): Rgba {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
  return { r: n(0), g: n(2), b: n(4), a: h.length >= 8 ? n(6) : 1 }
}

const centerCache = new Map<string, Rgba | null>()

/** Colour (with alpha) of the sprite's centre pixel, or null if the image isn't loaded. */
export function spriteCenterRgba(name: string): Rgba | null {
  if (centerCache.has(name)) return centerCache.get(name)!
  const img = images.get(name)
  if (!img || !img.complete || img.naturalWidth === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2), 1, 1, 0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  // Canvas returns premultiplied-then-unpremultiplied values; fine for our purposes.
  const c = { r: r / 255, g: g / 255, b: b / 255, a: a / 255 }
  centerCache.set(name, c)
  return c
}

/** Centre colour if the sprite is opaque there (used to hide 9-slice seams). */
export function spriteCenterColor(name: string): Rgba | null {
  const c = spriteCenterRgba(name)
  return c && c.a >= 0.98 ? c : null
}

const tintSourceCache = new Map<string, HTMLCanvasElement>()
const tintUrlCache = new Map<string, string>()

const isWhite = (c: Rgba) => c.r >= 0.999 && c.g >= 0.999 && c.b >= 0.999
const tintKey = (name: string, c: Rgba) => `${name}|${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)}`

/**
 * Drawable source for the sprite with its RGB multiplied by `color` (alpha ignored here).
 * Returns null until the image has loaded.
 */
export function tintedSpriteSource(name: string, color: string): CanvasImageSource | null {
  const img = images.get(name)
  if (!img || !img.complete || img.naturalWidth === 0) return null
  const c = parseColor(color)
  if (isWhite(c)) return img
  const key = tintKey(name, c)
  const cached = tintSourceCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    px[i] *= c.r
    px[i + 1] *= c.g
    px[i + 2] *= c.b
  }
  ctx.putImageData(data, 0, 0)
  tintSourceCache.set(key, canvas)
  return canvas
}

/** URL of the tinted sprite (for CSS backgrounds). */
export function tintedSpriteUrl(name: string, color: string): string {
  const c = parseColor(color)
  if (isWhite(c)) return spriteUrl(name)
  const key = tintKey(name, c)
  const cached = tintUrlCache.get(key)
  if (cached) return cached
  const source = tintedSpriteSource(name, color) as HTMLCanvasElement | null
  if (!source) return spriteUrl(name)
  const url = source.toDataURL()
  tintUrlCache.set(key, url)
  return url
}
