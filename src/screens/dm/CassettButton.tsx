// Timer Play/Stop/Pause button (Unity ToggleButton + animator "Button Cassett"). The latched
// (`selected`) state is the pressed-in look with a greyed face; Disabled keeps the scene
// layout but fades the face to 15% and greys the outline.
import type { CSSProperties, ReactNode } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps, type V2 } from '../../ui/Rect'
import { useButton, type StateDurations } from '../../ui/useButton'

const DURATIONS: StateDurations = { normal: 0.01, highlighted: 0.05, pressed: 0.05, selected: 0.05, disabled: 0 }

export interface CassettButtonProps extends RectProps {
  /** Scene face colour (Stop's face is slightly lighter than Play/Pause). */
  faceColor: string
  /** Scene (Normal) rect of the "Text (TMP)" icon holder: y position and height. */
  iconHolder: { y: number; h: number }
  icon: ReactNode
  selected: boolean
  disabled: boolean
  onClick: () => void
}

export function CassettButton({ faceColor, iconHolder, icon, selected, disabled, onClick, style, ...rect }: CassettButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled, selected })
  const down = visual === 'pressed' || visual === 'selected'
  const d = DURATIONS[visual]
  const anim: CSSProperties = { transition: `all ${d}s linear` }

  const facePos: V2 = down ? [0, -6] : [0, 6.75]
  const faceSize: V2 = down ? [-10, -24] : [-10, -23.5]
  // Selected clip writes the face RGB to 0.764 (alpha untouched).
  const face = visual === 'selected' ? '#C3C3C3FF' : faceColor
  const borderPos: V2 = down ? [0, -9] : [0, 9.25]
  const borderSize: V2 = down ? [0, -18] : [0, -18.51]
  const border = visual === 'disabled' ? '#8B8B8BFF' : '#282828FF'

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.1 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: `transform ${d}s linear`, ...style }}
    >
      <Img a={STRETCH} sprite="Button Border Square" color="#424242FF" sliced />
      <Img
        a={STRETCH}
        pos={facePos}
        size={faceSize}
        sprite="Button Background Sharp"
        color={face}
        opacity={visual === 'disabled' ? 0.15 : 1}
        sliced
        ppu={0.5}
        spritePpu={180}
        style={anim}
      />
      <Img
        a={STRETCH}
        pos={borderPos}
        size={borderSize}
        sprite={down ? 'Button Border Pressed Sharp' : 'Button Border Sharp'}
        color={border}
        sliced
        ppu={0.5}
        spritePpu={180}
        style={anim}
      />
      <Rect pos={[0, down ? -9.51 : iconHolder.y]} size={[200, down ? 176.59 : iconHolder.h]} style={anim}>
        {icon}
      </Rect>
    </Rect>
  )
}
