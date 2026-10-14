// Correct / Incorrect accusation buttons ("Button Default" animator). Same states as the
// shared Button3D, but these instances slice the face and outline at ppu 1.4 while the 3D
// base keeps ppu 1, which Button3D's single `ppu` can't express.
import type { CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { DEFAULT_DURATIONS, useButton } from '../../ui/useButton'

export interface AcceptButtonProps extends RectProps {
  label: string
  faceColor: string
  /** TMP margins differ per instance. */
  margin: readonly [number, number, number, number]
  disabled: boolean
  onClick: () => void
}

export function AcceptButton({ label, faceColor, margin, disabled, onClick, style, ...rect }: AcceptButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled })
  const down = visual === 'pressed'
  const d = DEFAULT_DURATIONS[visual]
  const anim: CSSProperties = { transition: `all ${d}s linear` }
  const facePos: V2 = down ? [0, -8] : [0, 6.75]
  const faceSize: V2 = down ? [-10, -24] : [-10, -23.5]

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.05 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: `transform ${d}s linear`, ...style }}
    >
      <Img a={STRETCH} pos={down ? [0, -5.75] : [0, 0]} size={down ? [0, -11.5] : [0, 0]} sprite="Button Border Square" color="#424242FF" sliced style={anim} />
      <Img
        a={STRETCH}
        pos={facePos}
        size={faceSize}
        sprite="Button Background Square"
        color={visual === 'disabled' ? '#42424278' : faceColor}
        opacity={down ? 0.58 : 1}
        sliced
        ppu={1.4}
        style={anim}
      />
      <Img
        a={STRETCH}
        pos={down ? [0, -8] : [0, 9.25]}
        size={[0, -18.51]}
        sprite="Button Border Pressed Square"
        color="#424242FF"
        sliced
        ppu={1.4}
        style={anim}
      />
      <Text a={STRETCH} pos={down ? [0, -5] : [0, 5.75]} size={[0, -11.5]} fontSize={72} color="#323232FF" margin={margin} nowrap style={anim}>
        {label}
      </Text>
    </Rect>
  )
}
