// Timer Container: mm:ss display over three latching cassette buttons (Play / Stop / Pause).
// Purely presentational; DMDisplay owns the timer state machine.
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { CassettButton } from './CassettButton'
import type { TimerState } from './timer'

export interface TimerPanelProps extends RectProps {
  time: string
  state: TimerState
  onPlay: () => void
  onStop: () => void
  onPause: () => void
}

export function TimerPanel({ time, state, onPlay, onStop, onPause, ...rect }: TimerPanelProps) {
  const disabled = state === 'AllGroupsDone'
  return (
    <Rect {...rect}>
      <Img sprite="Button Background Sharp" color="#424242FF" sliced spritePpu={180} />
      <Rect a={[0, 1, 1, 1]} pos={[0, -62.5]} size={[0, 125]}>
        <Rect a={[0.5, 0, 0.5, 1]} pos={[0, -1.14]} size={[300, -2.28]}>
          <Img sprite="Rectangle 123" color="#F5F5F5FF" sliced />
          <Text fontSize={110} color="#282828FF">
            {time}
          </Text>
          <Img a={STRETCH} pos={[0.5, -3.97]} size={[1, -5.94]} sprite="Rectangle 125" color="#B7B7B7FF" sliced />
          <Img a={STRETCH} size={[2, 2]} sprite="Rectangle 125" color="#282828FF" sliced />
        </Rect>
      </Rect>
      <Rect a={STRETCH} pos={[0, -62.5]} size={[0, -125]}>
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
}
