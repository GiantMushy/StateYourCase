// Unity UI Image equivalent. Renders as a leaf layer behind its parent's other children.
// Without rect props it stretches to fill the parent (the common case of an Image living on
// the same GameObject as its children).
import type { CSSProperties } from 'react'
import { linearAlpha } from './linearBlend'
import { rectStyle, type RectProps } from './Rect'
import { SlicedCanvas } from './SlicedCanvas'
import { parseColor, spriteCenterRgba, spriteInfo, tintedSpriteUrl } from './sprites'

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

/**
 * Opacity for the element. Unity blends in linear space, so the effective alpha is converted to
 * the sRGB alpha that gives the same result. For sliced sprites (bars, panels) the sprite's own
 * centre alpha is part of the blend; icons are judged by the tint alone.
 */
function imageOpacity({ sprite, color = '#FFFFFFFF', sliced, opacity = 1 }: ImgProps): number {
  const c = parseColor(color)
  const alpha = c.a * opacity
  const center = sprite && sliced ? spriteCenterRgba(sprite) : null
  const fg = center ? { r: c.r * center.r, g: c.g * center.g, b: c.b * center.b } : c
  const pixelAlpha = alpha * (center?.a ?? 1)
  if (pixelAlpha <= 0 || pixelAlpha >= 1) return Math.min(1, alpha)
  return Math.min(1, alpha * (linearAlpha(fg, pixelAlpha) / pixelAlpha))
}

export function Img(props: ImgProps & { style?: CSSProperties; className?: string }) {
  const { a, pivot, pos, size, scale, rot, flow, style, className, sprite, color = '#FFFFFFFF', sliced, ppu = 1, spritePpu, preserve } = props
  const hasRect = a || pos || size || flow
  const base: CSSProperties = hasRect
    ? rectStyle({ a, pivot, pos, size, scale, rot, flow })
    : { position: 'absolute', inset: 0, ...rectStyle({ a: [0, 0, 1, 1], scale, rot, pivot }) }
  const common: CSSProperties = { ...base, opacity: imageOpacity(props), pointerEvents: 'none' }

  if (sprite && sliced) {
    const unit = 100 / ((spritePpu ?? spriteInfo(sprite).ppu) * ppu)
    return <SlicedCanvas sprite={sprite} color={color} unit={unit} className={className} style={{ ...common, ...style }} />
  }

  const look: CSSProperties = sprite
    ? {
        backgroundImage: `url("${tintedSpriteUrl(sprite, color)}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: preserve ? 'contain' : '100% 100%',
      }
    : (() => {
        const c = parseColor(color)
        return { backgroundColor: `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})` }
      })()
  return <div className={className} style={{ ...common, ...look, ...style }} />
}
