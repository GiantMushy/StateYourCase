// Dice "x{n}" shuffle button in the topic card header (Unity animator "Button Shuffle").
// Its Selected clip is empty (scene defaults), so only Highlighted/Pressed/Disabled differ.
import type { CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { useButton, type StateDurations, buttonTransition } from '../../ui/useButton'

const DURATIONS: StateDurations = { normal: 0.1, highlighted: 0.25, pressed: 0.1, selected: 0.1, disabled: 0.25 }

export interface ShuffleButtonProps extends RectProps {
  count: number
  disabled: boolean
  onClick: () => void
}

/** How far the face's centre drops when pressed; label and icon ride with it exactly. */
const FACE_DROP = 6.642
/** Corner radius matched to the topic card's outline (b78 @ 180ppu ≈ 43 units). */
const PPU = (33 * 100) / (180 * ((78 * 100) / 180))
/** The rect was grown 8 right / 9 up to hug the card corner; content keeps its old spot. */
const SHIFT: [number, number] = [-4, -4.5]

export function ShuffleButton({ count, disabled, onClick, style, ...rect }: ShuffleButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled })
  const pressed = visual === 'pressed'
  const off = visual === 'disabled'
  const d = DURATIONS[visual]
  const anim: CSSProperties = { transition: buttonTransition('all', d, visual) }

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.04 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: buttonTransition('transform', d, visual), willChange: 'transform', ...style }}
    >
      {/* Disabled clip writes absolute colours: background (0.67, 0.667, 0.667), border 0.745. */}
      <Img
        a={STRETCH}
        pos={pressed ? [0, -6.642] : [0, 0]}
        size={pressed ? [-10, -23.285] : [-10, -10]}
        sprite="Rectangle 96"
        color={off ? '#ABAAAAFF' : '#F5F5F5FF'}
        sliced
        ppu={PPU}
        spritePpu={180}
        style={anim}
      />
      <Img
        a={STRETCH}
        // The frame stays put when pressed (only the face sinks), so it never pulls away from the card edge.
        sprite={pressed ? 'Rectangle 97' : 'Rectangle 122'}
        color={off ? '#BEBEBEFF' : '#424242FF'}
        sliced
        ppu={PPU}
        spritePpu={180}
        style={anim}
      />
      <Text
        a={STRETCH}
        pos={[33.66 + SHIFT[0], 8.1 + SHIFT[1] - (pressed ? FACE_DROP : 0)]}
        size={[-67.33, -16.21]}
        fontSize={75}
        color={off ? '#282828C5' : '#282828FF'}
        style={anim}
      >
        {`x${count}`}
      </Text>
      <Img
        pos={[-36.6 + SHIFT[0], 2.9 + SHIFT[1] - (pressed ? FACE_DROP : 0)]}
        size={[70, 70]}
        sprite="dice_icon"
        color="#282828FF"
        opacity={off ? 0.694 : 1}
        style={anim}
      />
    </Rect>
  )
}
