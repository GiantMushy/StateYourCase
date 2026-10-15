import { PHONE_CANVAS } from './Stage'
import { TintButton } from './TintButton'

/**
 * Distance from the top to the arrow's centre. Unity anchors it 900 above the canvas centre,
 * which is this on the reference phone (390×844) but drifts with the canvas height (into the
 * titles on tall windows, towards the edge on short ones), so it is pinned here instead.
 */
export const BACK_BUTTON_TOP = PHONE_CANVAS.height / 2 - 900
/** Bottom edge of the arrow (512×532 at scale 0.2), from the top of its parent. */
export const BACK_BUTTON_BOTTOM = BACK_BUTTON_TOP + (532 * 0.2) / 2

/**
 * The top-left arrow used on every screen. Top-anchored in its parent: the screen, or the
 * top of a scroll view's content so it scrolls with the title.
 */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <TintButton a={[0.5, 1, 0.5, 1]} pos={[-375, -BACK_BUTTON_TOP]} size={[512, 532]} scale={0.2} image={{ sprite: 'back_0' }} onClick={onClick} />
  )
}
