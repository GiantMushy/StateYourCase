// "Debate Time" — the DM's screen while groups present (Unity DMDisplayController). One
// vertical ScrollRect holds the topic, the presenting group's card, the per-group timer and a
// three-panel objective area (Accusation | Active | Inactive) switched by icon tabs.
// Ending a turn (Stop, or the timer reaching 0) slides in the next group; after the last
// group the timer locks and Next proceeds to voting.
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../game/config'
import * as M from '../game/model'
import { useGame } from '../game/store'
import type { Corruption, CorruptionType, Player } from '../game/types'
import { useLang, useT } from '../i18n'
import { clamp01, lerp, tween } from '../ui/anim'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { AccusationPanel } from './dm/AccusationPanel'
import { GroupCard } from './dm/GroupCard'
import { groupCardHeight } from './dm/groupCardLayout'
import { NoCorruptionsCard, ObjectiveCard } from './dm/ObjectiveCard'
import { ObjectiveTabs, type ObjectiveTab } from './dm/ObjectiveTabs'
import { formatTime, type TimerState } from './dm/timer'
import { TimerPanel } from './dm/TimerPanel'
import { useSettle } from './dm/useSettle'

/** Inspector slideDuration for the group-card swap and timer rewind. */
const SLIDE_DURATION = 0.45
/** Width of the masked group card area (the slide distance). */
const CARD_AREA_W = 850
/**
 * Inspector slideInCurve is flat at 1 (keys (0,1) and (1,1)), so the incoming card snaps into
 * place on the first frame and covers the outgoing card as it slides out underneath.
 */
const slideInCurve: (t: number) => number = () => 1
/** Inspector objectivesSlideOffset / objectivesSlideSpeed. */
const TRACK_OFFSET: Record<ObjectiveTab, number> = { Accusation: 1000, Active: 0, Inactive: -1000 }
const TRACK_SPEED = 8

/** Cards read Speech, then Betrayal, then Interruption (EnforceCardOrder). */
const TYPE_ORDER: Partial<Record<CorruptionType, number>> = { Speech: 0, Betrayal: 1, Interruption: 2 }

interface ObjectiveEntry {
  player: Player
  corruption: Corruption
}

export function DMDisplay() {
  const t = useT()
  const lang = useLang()
  const game = useGame((s) => s.game)
  const startVotingSequence = useGame((s) => s.startVotingSequence)
  const secretObjectives = useGame((s) => s.settings.secretObjectives)

  // OnEnable snapshot: group turn order by id.
  const [groups] = useState(() => M.groupList(useGame.getState().game))
  const [groupIndex, setGroupIndex] = useState(0)
  const [tab, setTab] = useState<ObjectiveTab>('Active')
  const trackX = useSettle(TRACK_OFFSET[tab], TRACK_SPEED)

  // ---------------------------------------------------------------- timer + group turns

  const [timerState, setTimerState] = useState<TimerState>('Stopped')
  const [time, setTime] = useState(() => formatTime(CONFIG.timerDuration))
  const remaining = useRef<number>(CONFIG.timerDuration)
  const showTime = (seconds: number) => {
    remaining.current = seconds
    setTime(formatTime(seconds))
  }

  /** Non-null while the next group's card slides in (Unity isTransitioning). */
  const [slide, setSlide] = useState<{ next: number; t: number } | null>(null)
  const cancelSlide = useRef<(() => void) | null>(null)
  useEffect(() => () => cancelSlide.current?.(), [])

  /** SlideInNextGroup: swap cards and rewind the timer display to full over the same tween. */
  const slideTo = (next: number) => {
    setTimerState('Stopped')
    const from = remaining.current
    setSlide({ next, t: 0 })
    cancelSlide.current = tween(
      SLIDE_DURATION,
      (raw) => {
        const u = clamp01(raw)
        setSlide({ next, t: u })
        showTime(lerp(from, CONFIG.timerDuration, u))
      },
      () => {
        cancelSlide.current = null
        showTime(CONFIG.timerDuration)
        setGroupIndex(next)
        setSlide(null)
      },
    )
  }

  const advanceToNextGroup = () => {
    const next = groupIndex + 1
    if (next < groups.length) slideTo(next)
    else setTimerState('AllGroupsDone')
  }
  const advanceRef = useRef(advanceToNextGroup)
  advanceRef.current = advanceToNextGroup

  // TimerCountdown: driven by real elapsed time, so it stays accurate across dropped frames
  // and background tabs (Unity clamps deltaTime; a wall-clock timer shouldn't).
  useEffect(() => {
    if (timerState !== 'Running') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.max(0, now - last) / 1000
      last = now
      showTime(Math.max(0, remaining.current - dt))
      if (remaining.current <= 0) return advanceRef.current()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [timerState])

  const onPlay = () => {
    if (slide) return
    if (timerState === 'Stopped' || timerState === 'Paused') setTimerState('Running')
  }
  const onPause = () => {
    if (slide || timerState !== 'Running') return
    setTimerState('Paused')
  }
  const onStop = () => {
    if (slide) return
    if (timerState === 'Running' || timerState === 'Paused') advanceToNextGroup()
  }

  // ---------------------------------------------------------------- objectives

  const currentGroupId = groups[groupIndex]?.id ?? -1
  const entries: ObjectiveEntry[] = M.nonDmPlayers(game)
    .map((player) => ({ player, corruption: M.corruptionOf(game, player.id) }))
    .filter((e): e is ObjectiveEntry => !!e.corruption && TYPE_ORDER[e.corruption.type] !== undefined)
    .sort(
      (a, b) =>
        TYPE_ORDER[a.corruption.type]! - TYPE_ORDER[b.corruption.type]! ||
        a.player.groupId - b.player.groupId ||
        a.player.id - b.player.id,
    )
  // Speech and Betrayal are judged during the player's own group's turn; Interruptions
  // during the other groups' turns.
  const isActive = ({ player, corruption }: ObjectiveEntry) =>
    corruption.type === 'Interruption' ? player.groupId !== currentGroupId : player.groupId === currentGroupId
  const active = entries.filter(isActive)
  const inactive = entries.filter((e) => !isActive(e))

  // ---------------------------------------------------------------- render

  const topic = game.currentTopic
  const isVersus = topic?.type !== 'Scenarios'
  const topicText = topic ? (lang === 'is' && topic.descriptionIs ? topic.descriptionIs : topic.description) : 'No topic selected.'

  const current = groups[groupIndex]
  const playersOf = (groupId: number) => M.playersInGroup(game, groupId)
  // The card area keeps the outgoing card's height until the slide finishes.
  const cardAreaH = current ? groupCardHeight(playersOf(current.id).length) : 0

  return (
    <Screen>
      <div className="scroll-y" style={{ position: 'absolute', inset: 0 }}>
        {/* Content: VerticalLayoutGroup padding top 150 / bottom 300, spacing 40, upper centre. */}
        {/* overflowX clip = the Viewport mask: the wide Objectives row can't widen the scroll area. */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 150, paddingBottom: 300, gap: 40, overflowX: 'clip' }}>
          {/* Header at scale 0.7 (layout uses the scaled height). */}
          <Rect flow size={[1393.93 * 0.7, 206.03 * 0.7]}>
            <Rect size={[1393.93, 206.03]} scale={0.7}>
              {lang === 'is' ? (
                <Img a={STRETCH} pos={[4.48, 0]} size={[-107.61, 0]} sprite="Umræðu Tími" preserve />
              ) : (
                <Img sprite="Debate Time" preserve />
              )}
            </Rect>
          </Rect>

          {/* Active Topic */}
          <Rect flow size={[850, 541.18]}>
            <Img sprite="Button Background Square" color="#FFFFFF32" sliced spritePpu={180} />
            <Rect a={[0, 1, 1, 1]} pos={[0, -62.75]} size={[0, 125.5]}>
              <Img sprite="Rectangle 117" color="#424242FF" sliced />
              <Img sprite="Rectangle 120" color="#282828FF" sliced />
              {topic && (
                <Text fontSize={110} color="#F5F5F5FF" align="Left" margin={[280.938, 0, 0, 0]}>
                  {isVersus ? t('Versus') : t('Scenario')}
                </Text>
              )}
              <Img pos={[-199, isVersus ? 0 : -6]} size={[80, 80]} sprite={isVersus ? 'swords_icon' : 'theater_icon'} color="#F5F5F5FF" />
            </Rect>
            <Rect a={STRETCH} pos={[0, -62.75]} size={[0, -125.51]}>
              <Text auto={[55, 75]} color="#414141FF" margin={[34.824, 0, 31.922, 10.157]}>
                {topicText}
              </Text>
            </Rect>
            <Img sprite="Button Border Pressed Square" color="#282828FF" sliced spritePpu={180} />
          </Rect>

          {/* Group Container (RectMask2D) */}
          <Rect flow size={[CARD_AREA_W, cardAreaH]} style={{ overflow: 'hidden' }}>
            {current && <GroupCard key={current.id} group={current} players={playersOf(current.id)} x={slide ? lerp(0, -CARD_AREA_W, slide.t) : 0} />}
            {slide && (
              <GroupCard
                key={groups[slide.next].id}
                group={groups[slide.next]}
                players={playersOf(groups[slide.next].id)}
                x={lerp(CARD_AREA_W, 0, slideInCurve(slide.t))}
              />
            )}
          </Rect>

          <TimerPanel flow size={[850, 354.69]} time={time} state={timerState} onPlay={onPlay} onStop={onStop} onPause={onPause} />

          {/* Objectives: wider than the viewport; the off-screen panels are clipped by it.
              Hidden entirely (with accusations) when Secret Objectives are off. */}
          {secretObjectives && (
            <Rect flow size={[1564, 1949.27]}>
              <ObjectiveTabs a={[0, 1, 0, 1]} pos={[782, -118.21]} size={[865.48, 216.42]} selected={tab} onTabChange={setTab} />
              <Rect a={[0, 1, 0, 1]} pos={[782, -1119]} size={[981, 1700]}>
                <Rect a={STRETCH} pos={[trackX, 0]}>
                  <AccusationPanel a={[0, 1, 0, 1]} pos={[-535, -686]} size={[800, 1400]} />
                  <ObjectiveColumn x={465} entries={active} showEmptyCard />
                  <ObjectiveColumn x={1465} entries={inactive} />
                </Rect>
              </Rect>
            </Rect>
          )}
        </div>
      </div>

      {timerState === 'AllGroupsDone' && <Button3D pos={[0, -750]} size={[750, 200]} label={t('Next')} onClick={startVotingSequence} />}
    </Screen>
  )
}

/** Active / Inactive Objectives container: VerticalLayoutGroup, spacing 50, upper centre. */
function ObjectiveColumn({ x, entries, showEmptyCard }: { x: number; entries: ObjectiveEntry[]; showEmptyCard?: boolean }) {
  return (
    <Rect a={[0, 1, 0, 1]} pos={[x, -361]} size={[800, 750]}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
        {entries.map((e) => (
          <ObjectiveCard key={e.player.id} player={e.player} corruption={e.corruption} />
        ))}
        {showEmptyCard && entries.length === 0 && <NoCorruptionsCard />}
      </div>
    </Rect>
  )
}
