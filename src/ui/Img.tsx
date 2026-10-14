// Unity UI Image equivalent. Renders as a leaf layer behind its parent's other children.
// Without rect props it stretches to fill the parent (the common case of an Image living on
// the same GameObject as its children).
import type { CSSProperties } from 'react'
import { rectStyle, type RectProps } from './Rect'
import { linearAlpha } from './linearBlend'
import { parseColor, spriteCenterColor, spriteCenterRgba, spriteInfo, tintedSpriteUrl } from './sprites'

export interface ImgProps extends Omit<RectProps, 'color'> {
  /** Sprite name as in Unity; omit for a plain coloured rect (Unity's default UISprite-less Image). */
  sprite?: string
  /** Unity colour, '#RRGGBB[AA]'. */
  color?: string
  /** Image.Type.Sliced — 9-slice using the sprite's border. */
  sliced?: boolean
  /** Image.pixelsPerUnitMultiplier (sliced only). */
  ppu?: number
  /** Override the sprite's own PixelsPerUnit when the scene used a different import (dump's spritePPU). */
  spritePpu?: number
  /** Image.preserveAspect. */
  preserve?: boolean
  /** Extra opacity multiplier (e.g. CanvasGroup-like fades of just this image). */
  opacity?: number
}

export function imageStyle({ sprite, color = '#FFFFFFFF', sliced, ppu = 1, spritePpu, preserve, opacity = 1 }: ImgProps): CSSProperties {
  const c = parseColor(color)
  // Unity blends in linear space: convert the effective alpha (tint × sprite × opacity) into
  // the sRGB alpha that gives the same result, judged at the sprite's centre pixel.
  const center = sprite ? spriteCenterRgba(sprite) : { r: 1, g: 1, b: 1, a: 1 }
  const alpha = c.a * opacity
  const pixelAlpha = alpha * (center?.a ?? 1)
  const corrected =
    center && pixelAlpha > 0 && pixelAlpha < 1
      ? alpha * (linearAlpha({ r: c.r * center.r, g: c.g * center.g, b: c.b * center.b }, pixelAlpha) / pixelAlpha)
      : alpha
  const style: CSSProperties = { opacity: Math.min(1, corrected), pointerEvents: 'none' }
  if (!sprite) {
    style.backgroundColor = `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})`
    return style
  }
  const url = `url("${tintedSpriteUrl(sprite, color)}")`
  if (sliced) {
    const info = spriteInfo(sprite)
    const [l, b, r, t] = info.border
    const unit = 100 / ((spritePpu ?? info.ppu) * ppu)
    style.boxSizing = 'border-box'
    style.borderStyle = 'solid'
    style.borderColor = 'transparent'
    style.borderWidth = `${t * unit}px ${r * unit}px ${b * unit}px ${l * unit}px`
    style.borderImage = `${url} ${t} ${r} ${b} ${l} fill / ${t * unit}px ${r * unit}px ${b * unit}px ${l * unit}px stretch`
  } else {
    style.backgroundImage = url
    style.backgroundRepeat = 'no-repeat'
    style.backgroundPosition = 'center'
    style.backgroundSize = preserve ? 'contain' : '100% 100%'
  }
  return style
}

/**
 * Browsers draw the nine border-image pieces separately, so under fractional scaling a hairline
 * of whatever is behind can show along the slice seams. For opaque sliced sprites we draw the
 * centre colour just behind, extending slightly under the seams.
 */
function seamUnderlay(props: ImgProps): CSSProperties | null {
  const { sprite, sliced, color = '#FFFFFFFF', opacity = 1, ppu = 1, spritePpu } = props
  if (!sprite || !sliced) return null
  const c = parseColor(color)
  if (c.a * opacity < 0.99) return null
  const center = spriteCenterColor(sprite)
  if (!center) return null
  const info = spriteInfo(sprite)
  const unit = 100 / ((spritePpu ?? info.ppu) * ppu)
  const inset = (px: number) => `${Math.max(0, px * unit - 2)}px`
  const [l, b, r, t] = info.border
  return {
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: `${inset(t)} ${inset(r)} ${inset(b)} ${inset(l)}`,
    backgroundClip: 'padding-box',
    backgroundColor: `rgb(${center.r * c.r * 255}, ${center.g * c.g * 255}, ${center.b * c.b * 255})`,
    pointerEvents: 'none',
  }
}

export function Img(props: ImgProps & { style?: CSSProperties; className?: string }) {
  const { a, pivot, pos, size, scale, rot, flow, style, className } = props
  const hasRect = a || pos || size || flow
  const base: CSSProperties = hasRect ? rectStyle({ a, pivot, pos, size, scale, rot, flow }) : { position: 'absolute', inset: 0, ...rectStyle({ a: [0, 0, 1, 1], scale, rot, pivot }) }
  const underlay = seamUnderlay(props)
  const main = <div className={className} style={{ ...base, ...imageStyle(props), ...style }} />
  if (!underlay || flow) return main
  return (
    <>
      <div style={{ ...base, ...underlay, ...style }} />
      {main}
    </>
  )
}
