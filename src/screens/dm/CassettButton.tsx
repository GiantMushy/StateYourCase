// Timer Play/Stop/Pause key (Unity ToggleButton + animator "Button Cassett"), styled as a
// cassette-deck key set into the timer box. The key is one rigid cap — face, frame and icon —
// so the icon reads as carved into it. Raised, the cap's 3D lip shows below its frame; pressed
// or latched (`selected`), the whole cap sinks 18.5 units until it sits on the deck, with a
// greyed face. Unity also drew a separate grey base under each key and scaled keys up on
// hover; both are dropped so nothing ever pokes outside the cassette box.
//
// Drawn as CSS from Unity's "Sharp" sprites (see ui/slab.ts) so the face and frame can't drift
// apart; the sink is a GPU transform with the same timing as the other 3D buttons.
import type { ReactNode } from 'react'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { CORNER, LIP, LIP_SHADE, PRESS, RING, capTransition, cssColor, spriteUnit } from '../../ui/slab'
import { useButton } from '../../ui/useButton'

/** How far the cap sinks when pressed (Unity: frame from y 18.5 down to 0). */
const SINK = 18.5
/** The keys' sprites are scaled at 180 PPU × 0.5. */
const UNIT = spriteUnit(180, 0.5)

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
  const { visual, handlers } = useButton({ onClick, disabled, selected, minPressMs: PRESS.ms })
  const down = visual === 'pressed' || visual === 'selected'
  const off = visual === 'disabled'
  // Selected clip greys the face (RGB 0.764); hovering a raised key brightens it a touch.
  const face = cssColor(visual === 'selected' ? '#C3C3C3FF' : faceColor, visual === 'highlighted' ? 1.06 : 1, off ? 0.15 : 1)
  const frame = off ? '#8B8B8BFF' : '#282828FF'
  // Raised, the frame sprite ("Button Border Sharp") ends in a lip; pressed ("… Pressed Sharp") it doesn't.
  const lip = down ? 0 : LIP * UNIT

  return (
    <Rect {...rect} {...handlers} style={{ cursor: disabled ? 'default' : 'pointer', ...style }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${down ? SINK : 0}px)`, transition: capTransition(down), willChange: 'transform' }}>
        <Rect a={STRETCH} pos={[0, 9.25]} size={[0, -18.51]}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: lip,
              boxSizing: 'border-box',
              border: `${RING * UNIT}px solid ${cssColor(frame)}`,
              borderRadius: CORNER.Sharp * UNIT,
              backgroundColor: face,
              backgroundClip: 'padding-box',
              boxShadow: lip ? `0 ${lip}px 0 0 ${cssColor(frame, LIP_SHADE)}` : undefined,
              transition: 'background-color 0.25s ease-out',
            }}
          />
        </Rect>
        <Rect pos={[0, iconHolder.y]} size={[200, iconHolder.h]}>
          {icon}
        </Rect>
      </div>
    </Rect>
  )
}
