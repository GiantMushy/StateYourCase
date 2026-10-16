// The timer as a cassette deck (redesign of Unity's Timer Container): the mm:ss counter tab on
// top, a recessed well that holds the presenting group's cassette, and the three latching
// deck keys (Play / Stop / Pause) along the bottom. Purely presentational; DMDisplay owns the
// timer state machine and the tape swaps.
import { forwardRef, type ReactNode } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { CassettButton } from './CassettButton'
import type { TimerState } from './timer'

export const DECK_W = 850
const COUNTER_H = 125
const KEYS_H = 229.69
/** The well the cassette sits in (sized for a 760×500 tape plus a margin). */
const WELL = { w: 790, h: 540, top: COUNTER_H + 12 }
export const DECK_H = WELL.top + WELL.h + 16 + KEYS_H

/** The counter turns red for the last seconds of a running turn. */
const WARN_SECONDS = 10

export interface CassetteDeckProps extends RectProps {
  time: string
  seconds: number
  state: TimerState
  onPlay: () => void
  onStop: () => void
  onPause: () => void
  /** The well's contents (the cassette, or the empty-deck message). */
  children: ReactNode
}

export const CassetteDeck = forwardRef<HTMLDivElement, CassetteDeckProps>(function CassetteDeck(
  { time, seconds, state, onPlay, onStop, onPause, children, ...rect },
  ref,
) {
  const disabled = state === 'AllGroupsDone'
  const warn = state === 'Running' && seconds <= WARN_SECONDS
  return (
    <Rect ref={ref} {...rect}>
      <Img sprite="Button Background Sharp" color="#424242FF" sliced spritePpu={180} />

      {/* Well: a dark recess with an inner lip; the cassette is laid on top of it. */}
      <Rect a={[0.5, 1, 0.5, 1]} pivot={[0.5, 1]} pos={[0, -WELL.top]} size={[WELL.w, WELL.h]}>
        <Img sprite="Button Background Sharp" color="#282828FF" sliced spritePpu={180} />
        <Img a={STRETCH} pos={[0, -6]} size={[-16, -20]} sprite="Button Background Sharp" color="#323232FF" sliced spritePpu={180} />
        {children}
      </Rect>

      {/* Counter tab (drawn over the well, so a lifted tape passes under it) */}
      <Rect a={[0, 1, 1, 1]} pos={[0, -COUNTER_H / 2]} size={[0, COUNTER_H]}>
        <Rect a={[0.5, 0, 0.5, 1]} pos={[0, -1.14]} size={[300, -2.28]}>
          <Img sprite="Rectangle 123" color="#F5F5F5FF" sliced />
          <Text fontSize={110} color={warn ? '#E0073FFF' : '#282828FF'} className={warn ? 'counter-warn' : undefined}>
            {time}
          </Text>
          <Img a={STRETCH} pos={[0.5, -3.97]} size={[1, -5.94]} sprite="Rectangle 125" color="#B7B7B7FF" sliced />
          <Img a={STRETCH} size={[2, 2]} sprite="Rectangle 125" color="#282828FF" sliced />
        </Rect>
      </Rect>

      {/* Deck keys */}
      <Rect a={[0, 0, 1, 0]} pivot={[0.5, 0]} size={[0, KEYS_H]}>
        <Img a={[0, 0, 1, 0]} pos={[0, 62.5]} size={[0, 125]} sprite="Rectangle 123" color="#000000FF" sliced />
        <CassettButton
          a={[0, 0, 0, 1]}
          pos={[141.44, 0]}
          size={[280, 0]}
          faceColor="#F2F2F2FF"
          iconHolder={{ y: 8.7, h: 176.59 }}
          icon={<Img pos={[4, 0]} size={[108, 122]} scale={0.8} sprite="play_icon" />}
          selected={state === 'Running'}
          disabled={disabled}
          onClick={onPlay}
          data-testid="timer-play"
        />
        <CassettButton
          a={[0.5, 0, 0.5, 1]}
          pos={[0.72, 0]}
          size={[288.56, 0]}
          faceColor="#F5F5F5FF"
          iconHolder={{ y: 8.85, h: 176.8 }}
          icon={<Img pos={[0, 2.8]} size={[70, 70]} scale={1.3} sprite="stop_red_icon_0" />}
          selected={state === 'Stopped' || state === 'AllGroupsDone'}
          disabled={disabled}
          onClick={onStop}
          data-testid="timer-stop"
        />
        <CassettButton
          a={[1, 0, 1, 1]}
          pos={[-140, 0]}
          size={[280, 0]}
          faceColor="#F2F2F2FF"
          iconHolder={{ y: 9.07, h: 175.59 }}
          icon={<Img pos={[0, 2.81]} size={[60, 70]} scale={[2, 1.5]} sprite="Pause_Icon" />}
          selected={state === 'Paused'}
          disabled={disabled}
          onClick={onPause}
          data-testid="timer-pause"
        />
      </Rect>
      <Img sprite="Button Border Pressed Sharp" color="#282828FF" sliced spritePpu={180} />
    </Rect>
  )
})
