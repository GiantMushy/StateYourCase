// The game's main chunky button (Unity animator controller "Button Default"): a dark 3D
// base, a light face and an outline that press down together. Pressed/Selected/Disabled
// values are copied from the animation clips; Normal is the per-instance scene layout.
import type { CSSProperties, ReactNode } from 'react'
import { Img } from './Img'
import { Rect, STRETCH, type RectProps, type V2 } from './Rect'
import { Text, type TextProps } from './Text'
import { DEFAULT_DURATIONS, useButton } from './useButton'

export interface Button3DProps extends RectProps {
  label?: ReactNode
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  /** Outline + 3D base colour (#424242 on most screens, #282828 on pack cards). */
  edgeColor?: string
  faceColor?: string
  ppu?: number
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
  const anim: CSSProperties = { transition: `all ${d}s linear` }

  const basePos: V2 = down ? [0, -5.75] : [0, 0]
  const baseSize: V2 = down ? [0, -11.5] : [0, 0]
  const facePos: V2 = down ? [face.pos[0], -8] : face.pos
  const faceSize: V2 = down ? [face.size[0], -24] : face.size
  const outlinePos: V2 = down ? [outline.pos[0], -8] : outline.pos
  const textPos: V2 = down ? [textRect.pos[0], -5] : textRect.pos
  const faceTint = visual === 'disabled' ? '#42424278' : faceColor
  const faceOpacity = down ? 0.58 / (parseInt(faceColor.slice(7, 9) || 'FF', 16) / 255) : 1

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? hoverScale : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: `transform ${d}s linear`, ...style }}
    >
      <Img a={STRETCH} pos={basePos} size={baseSize} sprite="Button Border Square" color={edgeColor} sliced ppu={ppu} spritePpu={spritePpu} style={anim} />
      <Img a={STRETCH} pos={facePos} size={faceSize} sprite="Button Background Square" color={faceTint} opacity={faceOpacity} sliced ppu={ppu} spritePpu={spritePpu} style={anim} />
      <Img a={STRETCH} pos={outlinePos} size={outline.size} sprite="Button Border Pressed Square" color={edgeColor} sliced ppu={ppu} spritePpu={spritePpu} style={anim} />
      {label !== undefined && (
        <Rect a={STRETCH} pos={textPos} size={textRect.size} style={anim}>
          <Text {...{ fontSize: 150, auto: [72, 150] as const, margin: [38.137, 0, 36.667, 0] as const, ...text }}>{label}</Text>
          {textExtra}
        </Rect>
      )}
      {overlay && (
        <Rect a={STRETCH} pos={down ? [0, -17.25] : [0, 0]} style={anim}>
          {overlay}
        </Rect>
      )}
    </Rect>
  )
}
