// DM picks the round's topic (Unity TopicSelectionController). One Versus and one Scenario
// topic are drawn per round (kept in the store so Back from Metric Selection preserves
// them); tabs switch which one is shown, the dice re-draws both while shuffles remain.
import { useLayoutEffect } from 'react'
import { useGame } from '../game/store'
import type { Topic } from '../game/types'
import { useLang, useT } from '../i18n'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { ShuffleButton } from './topic/ShuffleButton'
import { TAB_VARIANTS, TopicTabButton } from './topic/TopicTabButton'

export function TopicSelection() {
  const t = useT()
  const lang = useLang()
  const choice = useGame((s) => s.topicChoice)
  const setTopicChoice = useGame((s) => s.setTopicChoice)
  const loadTopicsForRound = useGame((s) => s.loadTopicsForRound)
  const shuffleTopics = useGame((s) => s.shuffleTopics)
  const selectTopic = useGame((s) => s.selectTopic)

  // OnEnable: draws fresh topics only on a new round (the store guards re-entry).
  useLayoutEffect(() => loadTopicsForRound(), [loadTopicsForRound])

  const versus = choice.versusSelected
  const displayed: Topic | null = versus ? choice.versus : choice.scenario
  const description = displayed
    ? lang === 'is' && displayed.descriptionIs
      ? displayed.descriptionIs
      : displayed.description
    : t('NoTopic')

  return (
    <Screen>
      {/* VerticalLayoutGroup: padding top 200, spacing 60, upper centre. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 200, gap: 60 }}>
        <Rect flow size={[976.67, 364.2]}>
          {lang === 'is' ? (
            <Img a={STRETCH} pos={[0, -9.72]} size={[0, -134.36]} scale={1.5} sprite="Þú ert Þingstjóri" preserve />
          ) : (
            <Img a={STRETCH} pos={[0, 46.84]} size={[0, -62.45]} scale={1.5} sprite="You Are The Discussion Moderator" preserve />
          )}
        </Rect>

        <Text flow size={[800, 129.07]} fontSize={75} color="#414141FF">
          {t('Choose_a_bill')}
        </Text>

        <Rect flow size={[840, 220]}>
          <TopicTabButton
            a={[0, 0, 0, 1]}
            pos={[210, 0]}
            size={[420, 0]}
            variant={TAB_VARIANTS.Versus}
            label={t('Versus')}
            toggled={versus}
            onClick={() => setTopicChoice((c) => void (c.versusSelected = true))}
          />
          <TopicTabButton
            a={[1, 0, 1, 1]}
            pos={[-210, 0]}
            size={[420, 0]}
            variant={TAB_VARIANTS.Scenario}
            label={t('Scenario')}
            toggled={!versus}
            onClick={() => setTopicChoice((c) => void (c.versusSelected = false))}
          />
        </Rect>

        <Rect flow size={[840, 600]}>
          {/* Body */}
          <Img sprite="Button Background Square" color="#F5F5F53C" sliced spritePpu={180} />
          <Text auto={[40, 90]} color="#282828FF" align="Top" margin={[25.545, 185.201, 28.099, 28.099]}>
            {description}
          </Text>
          {/* Header */}
          <Rect a={[0, 1, 1, 1]} pos={[0, -62.5]} size={[0, 125]}>
            <Img sprite="Rectangle 117" color="#424242FF" sliced spritePpu={180} />
            <Img sprite="Rectangle 120" color="#282828FF" sliced spritePpu={180} />
            <Text a={[0, 0, 0, 1]} pos={[360.96, 0]} size={[458.92, 0]} auto={[80, 120]} color="#FFFFFFFF" align="Left">
              {versus ? t('Versus') : t('Scenario')}
            </Text>
            {/* Unity swaps only the sprite; the rect stays 75×75. The masks' artwork fills only the top
                122/144 px of its sprite, so it's nudged down to look vertically centred. */}
            <Img a={[0, 0.5, 0, 0.5]} pos={[81, versus ? 0 : -5.7]} size={[75, 75]} sprite={versus ? 'swords_icon' : 'theater_icon'} />
            {/* Grown 8 right / 9 up from the Unity rect so it hugs the card's top-right corner. */}
            <ShuffleButton
              a={[1, 0, 1, 1]}
              pos={[-125.04, -24.69]}
              size={[249.09, 50.39]}
              count={choice.shufflesRemaining}
              disabled={choice.shufflesRemaining <= 0}
              onClick={shuffleTopics}
            />
          </Rect>
          <Img sprite="Button Border Pressed Square" color="#282828FF" sliced spritePpu={180} />
        </Rect>

        <Button3D flow size={[750, 223.16]} label={t('Select')} disabled={!displayed} onClick={selectTopic} />
      </div>
    </Screen>
  )
}
