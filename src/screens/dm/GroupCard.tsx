// "Debate Time Group Prefab": position header (For/Against), group name and one pill per
// player. Its height (groupCardHeight) is computed rather than measured.
import type { Group, Player } from '../../game/types'
import { useT } from '../../i18n'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { FIELD_H, groupCardHeight, HEADER_H, NAME_H, SPACING } from './groupCardLayout'

export function GroupCard({ group, players, x }: { group: Group; players: Player[]; x: number }) {
  const t = useT()
  const pos: V2 = [x, 0]
  return (
    // Top-anchored, full width (BuildGroupCard); x is the slide offset.
    <Rect a={[0, 1, 1, 1]} pivot={[0.5, 1]} pos={pos} size={[0, groupCardHeight(players.length)]}>
      <Img sprite="Button Border Pressed Square" color="#282828FF" sliced spritePpu={180} />
      <Rect a={[0, 1, 1, 1]} pos={[0, -HEADER_H / 2]} size={[0, HEADER_H]}>
        <Img sprite="Rectangle 117" color="#424242FF" sliced />
        <Text fontSize={100} color="#F5F5F5FF" margin={[0, 0, 0, 22.345]}>
          {t(group.position)}
        </Text>
        <Img sprite="Rectangle 120" color="#282828FF" sliced />
      </Rect>
      <div style={{ position: 'absolute', top: HEADER_H, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING }}>
        <Text flow size={[833.71, NAME_H]} fontSize={65} color="#282828FF" align="Left" margin={[15.82, 0, 0, 0]}>
          {group.name}
        </Text>
        {players.map((p) => (
          <Rect key={p.id} flow size={[750, FIELD_H]}>
            <Img sprite="Button Background Default" color="#DDDDDDFF" sliced ppu={1.4} spritePpu={180} />
            <Img a={STRETCH} size={[2, 2]} sprite="Button Border Pressed Default" color="#424242FF" sliced ppu={1.4} spritePpu={180} />
            <Text fontSize={75} color="#424242FF">
              {p.name}
            </Text>
          </Rect>
        ))}
      </div>
    </Rect>
  )
}
