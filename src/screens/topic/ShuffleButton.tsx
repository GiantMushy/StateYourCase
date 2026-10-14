// Dice "x{n}" shuffle button in the topic card header (Unity animator "Button Shuffle").
// Its Selected clip is empty (scene defaults), so only Highlighted/Pressed/Disabled differ.
import type { CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { useButton, type StateDurations } from '../../ui/useButton'

const DURATIONS: StateDurations = { normal: 0.1, highlighted: 0.25, pressed: 0.1, selected: 0.1, disabled: 0.25 }

export interface ShuffleButtonProps extends RectProps {
  count: number
  disabled: boolean
  onClick: () => void
}

export function ShuffleButton({ count, disabled, onClick, style, ...rect }: ShuffleButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled })
  const pressed = visual === 'pressed'
  const off = visual === 'disabled'
  const d = DURATIONS[visual]
  const anim: CSSProperties = { transition: `all ${d}s linear` }

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.04 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: `transform ${d}s linear`, ...style }}
    >
      {/* Disabled clip writes absolute colours: background (0.67, 0.667, 0.667), border 0.745. */}
      <Img
        a={STRETCH}
        pos={pressed ? [0, -6.642] : [0, 0]}
        size={pressed ? [-10, -23.285] : [-10, -10]}
        sprite="Rectangle 96"
        color={off ? '#ABAAAAFF' : '#F5F5F5FF'}
        sliced
        ppu={0.7}
        spritePpu={180}
        style={anim}
      />
      <Img
        a={STRETCH}
        pos={pressed ? [0, -6] : [0, 0]}
        size={pressed ? [0, -12] : [0, 0]}
        sprite={pressed ? 'Rectangle 97' : 'Rectangle 122'}
        color={off ? '#BEBEBEFF' : '#424242FF'}
        sliced
        ppu={0.7}
        spritePpu={180}
        style={anim}
      />
      <Text
        a={STRETCH}
        pos={pressed ? [33.1, -4.4] : [33.66, 8.1]}
        size={[-67.33, -16.21]}
        fontSize={75}
        color={off ? '#282828C5' : '#282828FF'}
        style={anim}
      >
        {`x${count}`}
      </Text>
      <Img
        pos={pressed ? [-37.164, -9.604] : [-36.6, 2.9]}
        size={[70, 70]}
        sprite="dice_icon"
        color="#282828FF"
        opacity={off ? 0.694 : 1}
        style={anim}
      />
    </Rect>
  )
}
