// DM objective card (Unity "Corruption Card" prefab + CorruptionCardController): player name,
// points badge, description and a completion checkbox in the type's colours. Once the player
// is caught (Player.isAccused) the checkbox locks and the card dims under "Stolen Points".
import * as M from '../../game/model'
import { useGame } from '../../game/store'
import type { Corruption, CorruptionType, Player } from '../../game/types'
import { useLang, useT } from '../../i18n'
import { Img } from '../../ui/Img'
import { Rect, STRETCH } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { TintButton } from '../../ui/TintButton'
import { CARD_SPRITE, TEXT_COLOR } from '../corruption/style'

/** Inspector stolenDimAlpha (CanvasGroup on the card root, so the overlay dims too). */
const STOLEN_DIM_ALPHA = 0.55

/** Inspector toggle colours: checkbox border + checkmark, and checkbox face. */
const TOGGLE_COLORS: Record<CorruptionType, { border: string; background: string }> = {
  Speech: { border: '#019406FF', background: '#60FB8DFF' },
  Interruption: { border: '#3D00A6FF', background: '#8853EFFF' },
  Betrayal: { border: '#8C0C0CFF', background: '#F26B6BFF' },
  Civilian: { border: '#019406FF', background: '#60FB8DFF' },
}

export function ObjectiveCard({ player, corruption }: { player: Player; corruption: Corruption }) {
  const t = useT()
  const lang = useLang()
  const update = useGame((s) => s.update)
  const completed = useGame((s) => M.isCompleted(s.game, corruption.id))

  const accused = player.isAccused
  const textColor = TEXT_COLOR[corruption.type]
  const toggle = TOGGLE_COLORS[corruption.type]
  const description = lang === 'is' && corruption.descriptionIs ? corruption.descriptionIs : corruption.description

  return (
    <Rect flow size={[800, 400]} style={{ opacity: accused ? STOLEN_DIM_ALPHA : 1 }}>
      <Img sprite={CARD_SPRITE[corruption.type]} sliced ppu={1.8} />
      <Text a={[0, 1, 1, 1]} pos={[-112.81, -50.3]} size={[-225.61, 100.6]} fontSize={55} color={textColor} align="Left" margin={[34.343, 9.616, 13.737, 0]}>
        {player.name}
      </Text>
      <Text a={[0, 0, 1, 0]} pos={[0, 160.91]} size={[0, 321.82]} fontSize={45} color={textColor} align="Left" margin={[31.595, 0, 27.474, 35.717]}>
        {description}
      </Text>

      {/* Toggle Container: points badge + checkbox, overhanging the card's top-right corner. */}
      <Rect a={[1, 1, 1, 1]} pos={[-119.75, -40.3]} size={[279.5, 120.6]}>
        <Rect a={[0, 0.5, 0, 0.5]} pos={[62.96, 0.47]} size={[219.71, 80.17]}>
          <Img sprite="Rectangle 96" color="#424242B4" sliced />
          {/* The points number keeps its prefab white for every type. */}
          <Text a={STRETCH} pos={[-7.53, 0]} size={[-15.05, 0]} fontSize={50} color="#FFFFFFC9" align="Right" margin={[8.418, 8.501, 99.207, 8.973]} nowrap>
            {corruption.points}
          </Text>
          <Text a={STRETCH} pos={[-7.53, 0]} size={[-15.05, 0]} fontSize={50} color="#FFFFFFC9" align="Left" margin={[110.889, 8.501, 0.839, 8.973]} nowrap>
            {t('Points_abbreviated')}
          </Text>
          <Img sprite="Rectangle 97" color="#424242FF" sliced />
        </Rect>
        {/* Unity Toggle (ColorTint on the face only); the checkmark fades in/out over 0.1s. */}
        <TintButton
          a={[1, 1, 1, 1]}
          pos={[-60, -60]}
          size={[120, 120]}
          image={{ sprite: 'Button Background Sharp', color: toggle.background, sliced: true, ppu: 0.8, spritePpu: 180 }}
          disabled={accused}
          onClick={() => update((g) => M.setCorruptionCompleted(g, player.id, !completed))}
        >
          <Img a={STRETCH} size={[2, 2]} sprite="Button Border Sharp" color={toggle.border} sliced ppu={0.8} spritePpu={180} />
          <Img
            pos={[0, 4.2]}
            size={[90, 81]}
            scale={0.8}
            sprite="check_0"
            color={toggle.border}
            opacity={completed ? 1 : 0}
            style={{ transition: 'opacity 0.1s linear' }}
          />
        </TintButton>
      </Rect>

      {accused && (
        <Text
          a={[0, 0, 1, 0]}
          pos={[2, 183]}
          size={[0, 321.82]}
          rot={15}
          fontSize={140}
          color="#E0073FFF"
          align="Left"
          margin={[31.595, 0, 27.474, 35.717]}
          smallCaps
        >
          {t('StolenPoints')}
        </Text>
      )}
    </Rect>
  )
}

/** "No Corruptions Card" prefab, shown when the Active panel has nothing to judge. */
export function NoCorruptionsCard() {
  return (
    <Rect flow size={[800, 200]}>
      <Img sprite="Civ_container" sliced ppu={1.8} />
      {/* No LocalizeStringEvent in the prefab: the same (misspelt) text in both languages. */}
      <Text fontSize={65} color="#282828FF" margin={[52.308, 10.356, 57.064, 20.922]}>
        No Active Curruptions
      </Text>
    </Rect>
  )
}
