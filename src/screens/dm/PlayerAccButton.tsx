// Accusation list entry (Unity Button + animator "Button PlayerInAccList"). Besides the
// usual states, a second animator layer "Crossfire" (bool InCrossfire) recolours the button
// red with white text/icon while the player is a possible or chosen accusation target.
import type { CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { useButton, type StateDurations, buttonTransition } from '../../ui/useButton'

const DURATIONS: StateDurations = { normal: 0.25, highlighted: 0.05, pressed: 0.05, selected: 0.05, disabled: 0 }
const CROSSFIRE_DURATION = 0.05

export interface PlayerAccButtonProps extends RectProps {
  name: string
  icon: 'gavel_icon' | 'point_shadow_0'
  crossfire: boolean
  disabled: boolean
  onClick: () => void
}

export function PlayerAccButton({ name, icon, crossfire, disabled, onClick, style, ...rect }: PlayerAccButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled })
  const down = visual === 'pressed'
  const off = visual === 'disabled'
  const d = DURATIONS[visual]
  const anim: CSSProperties = { transition: `${buttonTransition('all', d, visual)}, color ${CROSSFIRE_DURATION}s linear` }

  // Disabled clip also re-lays the face: full width, nudged up.
  // Pressed: the face centre drops 6 units; name and icon ride with it exactly.
  const bgPos: V2 = down ? [0, -6] : off ? [0, 4.144] : [0, 0]
  const bgSize: V2 = down ? [-10, -24] : off ? [0, -8.289] : [-10, -10]
  const ink = crossfire ? '#F5F5F5FF' : '#424242FF'

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.1 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: buttonTransition('transform', d, visual), willChange: 'transform', ...style }}
    >
      <Img
        a={STRETCH}
        pos={bgPos}
        size={bgSize}
        sprite="Button Background Square"
        color={crossfire ? '#B21A33FF' : '#F5F5F5FF'}
        opacity={off ? 0.227 : 1}
        sliced
        ppu={1.2}
        spritePpu={140}
        style={anim}
      />
      <Img
        a={STRETCH}
        pos={down ? [0, -5.5] : [0, 0]}
        size={down ? [0, -12] : [0, 0]}
        sprite={down ? 'Button Border Pressed Square' : 'Button Border Square'}
        color={crossfire ? '#661A33FF' : '#424242FF'}
        opacity={off ? 0.502 : 1}
        sliced
        ppu={1.2}
        spritePpu={140}
        style={anim}
      />
      <Text
        a={[0, 0.5, 0, 0.5]}
        pos={[288.88, down ? 5.59 - 6 : 5.59]}
        size={[577.77, 73.96]}
        fontSize={60}
        color={ink}
        align="Left"
        margin={[30, 0, 0, 0]}
        nowrap
        textStyle={{ overflow: 'hidden', textOverflow: 'ellipsis', transition: `color ${CROSSFIRE_DURATION}s linear` }}
        style={anim}
      >
        {name}
      </Text>
      <Img a={[1, 0.5, 1, 0.5]} pos={[-62, down ? -6 : 0]} size={[80, 80]} sprite={icon} color={ink} style={anim} />
    </Rect>
  )
}
