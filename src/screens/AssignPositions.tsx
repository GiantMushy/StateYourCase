// For/Against assignment (Unity AssignPositionsController). Every visit re-randomises the
// stances, alternating from a coin-flipped first side so neighbouring groups oppose each
// other; each group card's swap button flips its own stance.
import { useLayoutEffect, useMemo, type CSSProperties } from 'react'
import * as M from '../game/model'
import { useGame } from '../game/store'
import type { Group, Player, Position } from '../game/types'
import { useLang, useT } from '../i18n'
import { BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { useButton } from '../ui/useButton'

const flip = (p: Position): Position => (p === 'For' ? 'Against' : 'For')

export function AssignPositions() {
  const t = useT()
  const lang = useLang()
  const game = useGame((s) => s.game)
  const update = useGame((s) => s.update)
  const setScreen = useGame((s) => s.setScreen)
  const startCorruptionSequence = useGame((s) => s.startCorruptionSequence)

  // OnEnable → RandomlyAssignPositions (groups ordered by id).
  useLayoutEffect(() => {
    update((g) => {
      let current: Position = Math.random() > 0.5 ? 'For' : 'Against'
      for (const group of M.groupList(g)) {
        group.position = current
        current = flip(current)
      }
    })
  }, [update])

  const groups = useMemo(() => M.groupList(game).map((g) => ({ group: g, players: M.playersInGroup(game, g.id) })), [game])

  const swap = (id: number) =>
    update((g) => {
      g.groups[id].position = flip(g.groups[id].position)
    })

  return (
    <Screen>
      {/* Scroll View → Content: VerticalLayoutGroup pad top 300 / bottom 500, spacing 70. */}
      <div style={{ position: 'absolute', inset: 0, overflowX: 'hidden', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 300, paddingBottom: 500, gap: 70 }}>
          <Rect flow size={[974.27, 320.97]}>
            <Img a={STRETCH} size={[0, 74.84]} scale={0.8} sprite={lang === 'is' ? 'Úthluta hlutverkum' : 'Assign Positions'} preserve />
          </Rect>
          {/* Group List: fixed 3000 tall in the scene (its ContentSizeFitter is unconstrained). */}
          <Rect flow size={[878.87, 3000]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
            {groups.map(({ group, players }) => (
              <GroupCard key={group.id} group={group} players={players} positionLabel={t(group.position)} onSwap={() => swap(group.id)} />
            ))}
          </Rect>
        </div>
      </div>

      <BackButton onClick={() => setScreen('MetricSelection')} />
      <Button3D pos={[0, -750]} size={[750, 200]} label={t('Next')} onClick={startCorruptionSequence} />
    </Screen>
  )
}

const NAME_ROW_H = 100
const ROW_SPACING = 30
const PAD_BOTTOM = 40

/** "Group Position Prefab": header row (name, stance, swap) above one pill per player. */
function GroupCard({ group, players, positionLabel, onSwap }: { group: Group; players: Player[]; positionLabel: string; onSwap: () => void }) {
  // ContentSizeFitter (preferred height) over a VerticalLayoutGroup: pad bottom 40, spacing 30.
  const height = NAME_ROW_H + players.length * (ROW_SPACING + NAME_ROW_H) + PAD_BOTTOM
  return (
    <Rect flow size={[880, height]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: ROW_SPACING }}>
      <Img sprite="Button Border Pressed Square" color="#282828FF" sliced spritePpu={180} />
      <Rect flow size={[879.61, NAME_ROW_H]}>
        <Text a={[0, 0, 0, 1]} pos={[217.97, 0]} size={[435.93, 0]} fontSize={55} color="#282828FF" align="TopLeft" margin={[25.503, 19.224, 0, 0]}>
          {group.name}
        </Text>
        <SwapButton onClick={onSwap} />
        <Text a={[1, 0, 1, 1]} pos={[-359.87, 0]} size={[435.93, 0]} fontSize={65} color="#282828FF" align="TopRight" margin={[19.224, 19.224, 16.315, 0]}>
          {positionLabel}
        </Text>
      </Rect>
      {players.map((p) => (
        <Rect key={p.id} flow size={[700, NAME_ROW_H]}>
          <Img a={STRETCH} size={[-2, -2]} sprite="Button Background Default" color="#D9D9D9FF" sliced ppu={1.3} spritePpu={220} />
          <Img sprite="Button Border Pressed Default" color="#282828FF" sliced ppu={1.3} spritePpu={220} />
          <Text auto={[18, 72]} color="#282828FF">
            {p.name}
          </Text>
        </Rect>
      ))}
    </Rect>
  )
}

/**
 * Swap button. Unity had no transition here; it now presses down like the topic shuffle button
 * ("Button Shuffle" pressed clip: face and border drop 6 units, border sprite swaps).
 */
function SwapButton({ onClick }: { onClick: () => void }) {
  const { visual, handlers } = useButton({ onClick })
  const down = visual === 'pressed'
  const anim: CSSProperties = { transition: 'all 0.1s linear' }
  return (
    <Rect a={[1, 0, 1, 1]} pos={[-70.95, 0]} size={[141.91, 0]} {...handlers} style={{ cursor: 'pointer' }}>
      <Img a={STRETCH} pos={down ? [0, -6] : [0, 0]} size={down ? [0, -12] : [0, 0]} sprite="Rectangle 96" color="#424242FF" sliced spritePpu={180} style={anim} />
      <Img a={STRETCH} pos={down ? [0, -6] : [0, 0]} size={down ? [0, -12] : [0, 0]} sprite={down ? 'Rectangle 97' : 'Rectangle 122'} color="#282828FF" sliced spritePpu={180} style={anim} />
      <Img pos={down ? [0, -7] : [0, 0]} size={[125, 101]} scale={0.6} sprite="swap_icon" style={anim} />
    </Rect>
  )
}
