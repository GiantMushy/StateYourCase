// Full-screen fade overlay (Unity TransitionController): fade in 0.5s, run the state change
// while opaque, hold 0.5s, fade out 0.5s. Blocks input while visible.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '../game/store'
import { tween } from '../ui/anim'
import { Img } from '../ui/Img'
import { Rect } from '../ui/Rect'
import { useStage, useStageOverlay } from '../ui/Stage'
import { Text } from '../ui/Text'

const FADE = 0.5
const HOLD = 0.5

export function Transition() {
  const transition = useGame((s) => s.transition)
  const endTransition = useGame((s) => s.endTransition)
  const [alpha, setAlpha] = useState(0)
  const { width, viewWidth } = useStage()
  const overlay = useStageOverlay()
  const band = (viewWidth - width) / 2

  useEffect(() => {
    if (!transition) return
    let cancel = tween(FADE, setAlpha, () => {
      transition.action()
      const hold = setTimeout(() => {
        cancel = tween(FADE, (t) => setAlpha(1 - t), endTransition)
      }, HOLD * 1000)
      cancel = () => clearTimeout(hold)
    })
    return () => cancel()
  }, [transition, endTransition])

  if (!transition) return null
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: alpha }}>
      {/* Pillarboxed (iPad): the same fill over the side bands outside the canvas. */}
      {band > 0 &&
        overlay &&
        createPortal(
          <div style={{ position: 'absolute', inset: 0, opacity: alpha }}>
            <Img a={[0, 0, 0, 1]} pivot={[0, 0.5]} size={[band, 0]} color="#49CFCBFF" style={{ pointerEvents: 'auto' }} />
            <Img a={[1, 0, 1, 1]} pivot={[1, 0.5]} size={[band, 0]} color="#49CFCBFF" style={{ pointerEvents: 'auto' }} />
          </div>,
          overlay,
        )}
      <Img color="#49CFCBFF" style={{ pointerEvents: 'auto' }} />
      <Img pos={[0, 400]} size={[332, 265]} scale={2.5} sprite="State your Case" />
      <Rect pos={[0, -347]} size={[449, 448]} scale={0.7} rot={116.702}>
        <div style={{ position: 'absolute', inset: 0, animation: 'spin 7.2s linear infinite reverse' }}>
          <Img sprite="German Seats" color="#F5F5F528" />
        </div>
      </Rect>
      <Text a={[0, 0.5, 1, 0.5]} pos={[0, -518]} size={[-200, 145.42]} fontSize={90} color="#41414184">
        {transition.text}
      </Text>
    </div>
  )
}
