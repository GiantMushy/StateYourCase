import { useState } from 'react'
import { lerpStep, useFrame } from '../../ui/anim'

/** Squared-distance epsilon of 0.25 px used by the Unity controllers to stop lerping. */
const SETTLE_EPSILON = 0.25

/**
 * Unity `Update() { pos = Lerp(pos, target, dt * speed) }` with a settle snap (OptionToggle
 * highlight, DMDisplay slide track). Frames only run while the value is still moving.
 */
export function useSettle(target: number, speed: number): number {
  const [value, setValue] = useState(target)
  useFrame((dt) => {
    setValue((cur) => (Math.abs(cur - target) <= SETTLE_EPSILON ? target : lerpStep(cur, target, speed, dt)))
  }, value !== target)
  return value
}
