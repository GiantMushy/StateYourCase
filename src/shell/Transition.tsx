// Full-screen fade overlay (Unity TransitionController): fade in 0.5s, run the state change
// while opaque, hold 0.5s, fade out 0.5s. Blocks input while visible. Rendered in the Stage's
// window-wide overlay: the fill covers the whole window, the content sits in a canvas-sized box.
import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { tween } from '../ui/anim'
import { Img } from '../ui/Img'
import { Rect } from '../ui/Rect'
import { useStage } from '../ui/Stage'
import { Text } from '../ui/Text'

const FADE = 0.5
const HOLD = 0.5

export function Transition() {
  const transition = useGame((s) => s.transition)
  const endTransition = useGame((s) => s.endTransition)
  const [alpha, setAlpha] = useState(0)
  const { width, height, safe } = useStage()

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
      <Img color="#49CFCBFF" style={{ pointerEvents: 'auto' }} />
      {/* Centred on the safe area (the fill also covers the system bars). */}
      <Rect pos={[(safe.left - safe.right) / 2, (safe.bottom - safe.top) / 2]} size={[width, height]}>
        <Img pos={[0, 400]} size={[332, 265]} scale={2.5} sprite="State your Case" />
        <Rect pos={[0, -347]} size={[449, 448]} scale={0.7} rot={116.702}>
          <div style={{ position: 'absolute', inset: 0, animation: 'spin 7.2s linear infinite reverse' }}>
            <Img sprite="German Seats" color="#F5F5F528" />
          </div>
        </Rect>
        <Text a={[0, 0.5, 1, 0.5]} pos={[0, -518]} size={[-200, 145.42]} fontSize={90} color="#41414184">
          {transition.text}
        </Text>
      </Rect>
    </div>
  )
}
