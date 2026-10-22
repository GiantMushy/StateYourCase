// The game's main chunky button (Unity animator controller "Button Default"): a dark 3D
// base, a light face and an outline that press down together. Pressed/Selected/Disabled
// values are copied from the animation clips; Normal is the per-instance scene layout.
// Deliberate change from Unity: the face stays opaque when pressed (the clip faded it to 58%).
import type { ReactNode } from 'react'
import { Img } from './Img'
import { Rect, STRETCH, type RectProps, type V2 } from './Rect'
import { spriteInfo } from './sprites'
import { Text, type TextProps } from './Text'
import { DEFAULT_DURATIONS, useButton, buttonTransition } from './useButton'

const BASE_SPRITE = 'Button Border Square'

/**
 * Clip that hides the top `inset` units of the dark base. Its top corners follow the sprite's
 * own rounding (circles as big as the 9-slice border, shrunk like the slicing shrinks them when
 * the button is too small), so the clipped base looks like a shorter 9-slice. A unit less, so at
 * rest the clip stays just outside the sprite's anti-aliased edge.
 */
function baseClip(inset: number, unit: number) {
  const { border: [left, bottom, right, top] } = spriteInfo(BASE_SPRITE)
  const rx = `min(${left * unit - 1}px, ${(left / (left + right)) * 100}%)`
  const ry = `min(${top * unit - 1}px, ${(top / (top + bottom)) * 100}%)`
  return `inset(${inset}px 0 0 0 round ${rx} ${rx} 0 0 / ${ry} ${ry} 0 0)`
}

export interface Button3DProps extends RectProps {
  label?: ReactNode
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  /** Outline + 3D base colour (#424242 on most screens, #282828 on pack cards). */
  edgeColor?: string
  faceColor?: string
  ppu?: number
  /** pixelsPerUnitMultiplier of the 3D base when it differs from the face/outline. */
  basePpu?: number
  spritePpu?: number
  /** Normal-state layout overrides (scene values differ slightly between instances). */
  face?: { pos: V2; size: V2 }
  outline?: { pos: V2; size: V2 }
  textRect?: { pos: V2; size: V2 }
  text?: Partial<Omit<TextProps, 'children'>>
  /** Children of the Unity "Text (TMP)" object (e.g. a subtitle), positioned in the text rect. */
  textExtra?: ReactNode
  /** Extra content drawn above the face (moves with the face when pressed). */
  overlay?: ReactNode
  /** Unity root scale when highlighted (hover). */
  hoverScale?: number
}

export function Button3D({
  label,
  onClick,
  disabled,
  selected,
  edgeColor = '#424242FF',
  faceColor = '#F2F2F2FF',
  ppu = 1,
  basePpu = ppu,
  spritePpu,
  face = { pos: [0, 6.75], size: [-10, -23.5] },
  outline = { pos: [0, 9.25], size: [0, -18.51] },
  textRect = { pos: [0, 5.75], size: [0, -11.5] },
  text,
  textExtra,
  overlay,
  hoverScale = 1.05,
  style,
  ...rect
}: Button3DProps) {
  const { visual, handlers } = useButton({ onClick, disabled, selected })
  const down = visual === 'pressed' || visual === 'selected'
  const d = DEFAULT_DURATIONS[visual]

  // The cap (face, outline, label, overlay) moves as one rigid layer via a transform, so the
  // label always tracks the frame exactly. Pressing drops it until the outline's top sits where
  // Unity's pressed clip puts it (-8); the dark base ends flush with the cap's top, so no dark
  // band shows above it (Unity left ~6 units peeking out; changed on request). The base is
  // clipped rather than resized: resizing re-laid out and redrew its 9-slice canvas every frame,
  // which stuttered on phones.
  const drop = outline.pos[1] + 8
  const pressedTopInset = 8 - outline.size[1] / 2
  const baseUnit = 100 / ((spritePpu ?? spriteInfo(BASE_SPRITE).ppu) * basePpu)
  const faceTint = visual === 'disabled' ? '#42424278' : faceColor

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? hoverScale : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: buttonTransition('transform', d, visual), willChange: 'transform', ...style }}
    >
      <Img
        a={STRETCH}
        sprite={BASE_SPRITE}
        color={edgeColor}
        sliced
        ppu={basePpu}
        spritePpu={spritePpu}
        style={{ clipPath: baseClip(down ? pressedTopInset : 0, baseUnit), transition: buttonTransition('clip-path', d, visual) }}
      />
      {/* Its own layer for good, so a press doesn't first have to create and paint one. */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${down ? drop : 0}px)`, transition: buttonTransition('transform', d, visual), willChange: 'transform' }}>
        <Img a={STRETCH} pos={face.pos} size={face.size} sprite="Button Background Square" color={faceTint} sliced ppu={ppu} spritePpu={spritePpu} />
        <Img a={STRETCH} pos={outline.pos} size={outline.size} sprite="Button Border Pressed Square" color={edgeColor} sliced ppu={ppu} spritePpu={spritePpu} />
        {label !== undefined && (
          <Rect a={STRETCH} pos={textRect.pos} size={textRect.size}>
            <Text {...{ fontSize: 150, auto: [72, 150] as const, margin: [38.137, 0, 36.667, 0] as const, ...text }}>{label}</Text>
            {textExtra}
          </Rect>
        )}
        {overlay && <Rect a={STRETCH}>{overlay}</Rect>}
      </div>
    </Rect>
  )
}
