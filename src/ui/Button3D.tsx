// The game's main chunky button (Unity animator controller "Button Default"): a dark 3D base
// under a cap (a light face inside a dark outline) that pushes down when pressed.
//
// Drawn as CSS rounded rectangles reproducing Unity's "Square" sprites (see slab.ts). Only the
// cap moves, as a GPU transform, so the press is equally smooth on every device. The base never
// changes: its top half is always under the cap, so it has no top edge to hide.
//
// Deliberate changes from Unity: the face stays opaque when pressed (the clip faded it to 58%);
// no dark band shows above the pressed cap; the press is a short eased push (Unity snapped it in
// 0.05 s) that always plays in full before the click fires.
import type { ReactNode } from 'react'
import { Rect, STRETCH, type RectProps, type V2 } from './Rect'
import { CORNER, HOVER, LIP, LIP_SHADE, PRESS, RING, capTransition, cssColor, spriteUnit } from './slab'
import { Text, type TextProps } from './Text'
import { useButton } from './useButton'

const SPRITE_PPU = 100

export interface Button3DProps extends RectProps {
  label?: ReactNode
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  /** Outline + 3D base colour (#424242 on most screens, #282828 on pack cards). */
  edgeColor?: string
  faceColor?: string
  /** pixelsPerUnitMultiplier of the face and outline (scales their corners and ring). */
  ppu?: number
  /** pixelsPerUnitMultiplier of the 3D base when it differs from the face/outline. */
  basePpu?: number
  spritePpu?: number
  /** Normal-state outline rect (scene values differ slightly between instances); the face fills it. */
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
  spritePpu = SPRITE_PPU,
  outline = { pos: [0, 9.25], size: [0, -18.51] },
  textRect = { pos: [0, 5.75], size: [0, -11.5] },
  text,
  textExtra,
  overlay,
  hoverScale = 1.05,
  style,
  ...rect
}: Button3DProps) {
  const { visual, handlers } = useButton({ onClick, disabled, selected, minPressMs: PRESS.ms })
  const down = visual === 'pressed' || visual === 'selected'

  const unit = spriteUnit(spritePpu, ppu)
  const baseUnit = spriteUnit(spritePpu, basePpu)
  // Pressing drops the cap until the outline's top sits where Unity's pressed clip puts it (-8).
  const drop = outline.pos[1] + 8
  const edge = cssColor(edgeColor)
  const R = CORNER.Square

  return (
    <Rect
      {...rect}
      {...handlers}
      data-button3d=""
      scale={visual === 'highlighted' ? hoverScale : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: `transform ${HOVER.ms}ms ${HOVER.easing}`, ...style }}
    >
      {/* Base: the sides, bottom and lip of the slab. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          bottom: LIP * baseUnit,
          boxSizing: 'border-box',
          border: `${RING * baseUnit}px solid ${edge}`,
          borderTop: 'none',
          borderRadius: `0 0 ${R * baseUnit}px ${R * baseUnit}px`,
          boxShadow: `0 ${LIP * baseUnit}px 0 0 ${cssColor(edgeColor, LIP_SHADE)}`,
          pointerEvents: 'none',
        }}
      />
      {/* Cap: face, outline, label and overlay move together on their own layer. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${down ? drop : 0}px)`,
          transition: capTransition(down),
          willChange: 'transform',
        }}
      >
        <Rect
          a={STRETCH}
          pos={outline.pos}
          size={outline.size}
          style={{
            boxSizing: 'border-box',
            border: `${RING * unit}px solid ${edge}`,
            borderRadius: R * unit,
            backgroundColor: cssColor(visual === 'disabled' ? '#42424278' : faceColor),
            // The face fills the ring's inside only, so no light fringe shows at its outer edge.
            backgroundClip: 'padding-box',
            pointerEvents: 'none',
          }}
        />
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
