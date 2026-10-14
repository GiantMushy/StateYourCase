// Three-icon tab bar (Unity OptionToggle): megaphone = Accusation, speaker = Active
// objectives (default), jury = Inactive objectives. A light highlight lerps to the selected
// icon; re-selecting the current tab does nothing.
import { Img } from '../../ui/Img'
import { Rect, type RectProps } from '../../ui/Rect'
import { TintButton } from '../../ui/TintButton'
import { useSettle } from './useSettle'

export type ObjectiveTab = 'Accusation' | 'Active' | 'Inactive'

/** Inspector highlightMoveSpeed. */
const HIGHLIGHT_SPEED = 10
const BAR_W = 865.48
/** Centre x of each option relative to the bar centre (the highlight's anchor). */
const OPTION_X: Record<ObjectiveTab, number> = { Accusation: 149 - BAR_W / 2, Active: 0, Inactive: BAR_W / 2 - 133 }

export function ObjectiveTabs({ selected, onTabChange, ...rect }: RectProps & { selected: ObjectiveTab; onTabChange: (tab: ObjectiveTab) => void }) {
  const highlightX = useSettle(OPTION_X[selected], HIGHLIGHT_SPEED)
  const select = (tab: ObjectiveTab) => tab !== selected && onTabChange(tab)

  return (
    <Rect {...rect}>
      <Rect a={[0, 0.5, 1, 0.5]} size={[0, 174.21]}>
        <Img sprite="Button Background Sharp" color="#4242423C" sliced spritePpu={140} />
        <Img pos={[highlightX, 0]} size={[280, 220]} scale={0.9} sprite="Button Background Sharp" color="#F5F5F5FF" sliced spritePpu={140} />
        <TintButton a={[0, 0.5, 0, 0.5]} pos={[149, 0]} size={[512, 512]} scale={0.3} image={{ sprite: 'megaphone', color: '#3F3F3FFF' }} onClick={() => select('Accusation')} />
        <TintButton size={[150, 150]} image={{ sprite: 'speaker_icon', color: '#3F3F3FFF' }} onClick={() => select('Active')} />
        <TintButton a={[1, 0.5, 1, 0.5]} pos={[-133, 0]} size={[150, 150]} image={{ sprite: 'jury_icon', color: '#414141FF' }} onClick={() => select('Inactive')} />
      </Rect>
    </Rect>
  )
}
