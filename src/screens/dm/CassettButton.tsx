// Timer Play/Stop/Pause key (Unity ToggleButton + animator "Button Cassett"), styled as a
// cassette-deck key set into the timer box. The key is one rigid cap — face, frame and icon —
// so the icon reads as carved into it. Raised, the cap's 3D lip shows above the deck; pressed
// or latched (`selected`), the whole cap sinks 18.5 units until it sits on the deck, with a
// greyed face. Unity also drew a separate grey base under each key and scaled keys up on
// hover; both are dropped so nothing ever pokes outside the cassette box.
import type { CSSProperties, ReactNode } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { useButton, type StateDurations, buttonTransition } from '../../ui/useButton'

const DURATIONS: StateDurations = { normal: 0.08, highlighted: 0.05, pressed: 0.05, selected: 0.05, disabled: 0 }

/** How far the cap sinks when pressed (Unity: frame from y 18.5 down to 0). */
const SINK = 18.5

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
  const off = visual === 'disabled'
  const capMove: CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translateY(${down ? SINK : 0}px)`,
    transition: buttonTransition('transform', DURATIONS[visual], visual),
  }
  // Selected clip greys the face (RGB 0.764); hovering a raised key brightens it a touch.
  const face = visual === 'selected' ? '#C3C3C3FF' : faceColor

  return (
    <Rect {...rect} {...handlers} style={{ cursor: disabled ? 'default' : 'pointer', ...style }}>
      <div style={capMove}>
        <Img
          a={STRETCH}
          pos={[0, 6.75]}
          size={[-10, -23.5]}
          sprite="Button Background Sharp"
          color={face}
          opacity={off ? 0.15 : 1}
          sliced
          ppu={0.5}
          spritePpu={180}
          style={{ filter: visual === 'highlighted' ? 'brightness(1.06)' : undefined, transition: 'filter 0.25s ease-out' }}
        />
        <Img
          a={STRETCH}
          pos={[0, 9.25]}
          size={[0, -18.51]}
          sprite={down ? 'Button Border Pressed Sharp' : 'Button Border Sharp'}
          color={off ? '#8B8B8BFF' : '#282828FF'}
          sliced
          ppu={0.5}
          spritePpu={180}
        />
        <Rect pos={[0, iconHolder.y]} size={[200, iconHolder.h]}>
          {icon}
        </Rect>
      </div>
    </Rect>
  )
}
