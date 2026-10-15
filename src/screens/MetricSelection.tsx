// DM picks exactly two judging metrics (Unity MetricSelectionController + MetricDragHandler).
// Cards live at fixed "home" positions in the grid (an empty dashed field stays behind when
// one leaves) and jump to vote slot 1/2 by click or drag. Selections reset on every visit.
import { Fragment, useRef, useState } from 'react'
import { useGame } from '../game/store'
import type { Metric } from '../game/types'
import { useLang, useT, type StringKey } from '../i18n'
import { BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { DragGhost } from '../ui/DragLayer'
import { dropTargetAt, toStagePoint, type DragPoint } from '../ui/drag'
import { EmptySlot } from '../ui/EmptySlot'
import { Img } from '../ui/Img'
import { Rect, type V2 } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { CARD_SCALE, CARD_SIZE, MetricCard, MetricCardFace, type CaptionStyle } from './metric/MetricCard'

type Slots = readonly [Metric | null, Metric | null]

interface CardDef {
  metric: Metric
  label: StringKey
  home: V2
  caption: CaptionStyle
}

// Scene order = draw order. Caption margins/auto-size ranges differ per card in the scene
// (Enthusiasm's 1500 max is a scene typo, kept: width limits it anyway).
const CARDS: CardDef[] = [
  { metric: 'Comedy', label: 'Comedy', home: [-210, -312], caption: { auto: [100, 150], margin: [28.578, 0, 31.436, 0] } },
  { metric: 'Creativity', label: 'Creativity', home: [223, -312], caption: { auto: [100, 150], margin: [43.093, 0, 45.966, 0] } },
  { metric: 'OnTopic', label: 'On_topic', home: [-210, -463], caption: { auto: [100, 150], margin: [40.22, 0, 45.966, 0] } },
  { metric: 'Factual', label: 'Factual', home: [223, -463], caption: { auto: [100, 150], margin: [54.299, 0, 48.583, 0] } },
  { metric: 'Enthusiasm', label: 'Enthusiasm', home: [6.5, -614], caption: { auto: [100, 1500], margin: [40.009, 0, 42.867, 0] } },
]

const SLOT_POS: [V2, V2] = [
  [0, 95],
  [0, -89],
]

type DropId = 'slot0' | 'slot1' | 'grid'

// --- Slot rules (MetricSelectionController) ---------------------------------------------

/** OnMetricClicked: a slotted card returns to the grid; a grid card takes the first free slot. */
function clickMetric(slots: Slots, m: Metric): Slots {
  if (slots.includes(m)) return toGrid(slots, m)
  const free = slots.indexOf(null)
  if (free < 0) return slots
  const next: [Metric | null, Metric | null] = [...slots]
  next[free] = m
  return next
}

/**
 * PlaceMetricInSlot: dropping on its own slot is a no-op; dropping a slotted card on the
 * other occupied slot swaps them; dropping a grid card on an occupied slot sends the
 * occupant back to the grid.
 */
function placeInSlot(slots: Slots, m: Metric, idx: 0 | 1): Slots {
  const occupant = slots[idx]
  if (occupant === m) return slots
  const current = slots.indexOf(m)
  const next: [Metric | null, Metric | null] = [...slots]
  if (current >= 0) next[current] = null
  if (occupant !== null && current === 1 - idx) next[1 - idx] = occupant
  next[idx] = m
  return next
}

/** ReturnToGrid / MoveToGrid. */
function toGrid(slots: Slots, m: Metric): Slots {
  return slots.map((s) => (s === m ? null : s)) as unknown as Slots
}

// -----------------------------------------------------------------------------------------

interface DragState {
  metric: Metric
  x: number
  y: number
}

export function MetricSelection() {
  const t = useT()
  const lang = useLang()
  const setScreen = useGame((s) => s.setScreen)
  const setMetrics = useGame((s) => s.setMetrics)

  // OnEnable → ClearAllSelections: a fresh mount starts with both slots empty.
  const [slots, setSlots] = useState<Slots>([null, null])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState<DropId | null>(null)
  const hoverRef = useRef<DropId | null>(null)
  const draggedRef = useRef<Metric | null>(null)
  const stageEl = useRef<Element | null>(null)

  const updateHover = (p: DragPoint) => {
    const id = dropTargetAt(p) as DropId | null
    hoverRef.current = id
    setHover(id)
  }

  const onDragStart = (metric: Metric, p: DragPoint, el: Element) => {
    stageEl.current = el
    draggedRef.current = metric
    setDrag({ metric, ...toStagePoint(p, el) })
  }
  const onDragMove = (p: DragPoint) => {
    if (!stageEl.current) return
    const pt = toStagePoint(p, stageEl.current)
    setDrag((d) => d && { ...d, ...pt })
    updateHover(p)
  }
  const onDragEnd = () => {
    // Drop resolves against the target hovered on the last drag frame (Unity hoveredTarget).
    const target = hoverRef.current
    const metric = draggedRef.current
    draggedRef.current = null
    hoverRef.current = null
    setHover(null)
    setDrag(null)
    if (!metric) return
    if (target === 'slot0' || target === 'slot1') setSlots((s) => placeInSlot(s, metric, target === 'slot0' ? 0 : 1))
    else if (target === 'grid') setSlots((s) => toGrid(s, metric))
    // No target: ReturnToHome — the card simply snaps back to where its state says it is.
  }

  /** Hovering a slot tints its empty placeholder, or the (other) card occupying it. */
  const hoveredSlot = hover === 'slot0' ? 0 : hover === 'slot1' ? 1 : -1
  const ready = slots[0] !== null && slots[1] !== null
  const dragCard = drag && CARDS.find((c) => c.metric === drag.metric)!

  return (
    <Screen>
      <Text pos={[0, 349]} size={[800, 300]} fontSize={80} color="#414141FF">
        {t('Metrics_instructions')}
      </Text>
      <Rect a={[0, 1, 1, 1]} pos={[0, -370]} size={[0, 199.49]}>
        <Img
          sprite={lang === 'is' ? 'Á hvaða forsendum verða leikmennirnir dæmdir_' : 'Which metrics will the players be judged on_'}
          preserve
        />
      </Rect>
      <Img pos={[-347, 95]} size={[106, 208]} scale={0.6} sprite="1 2 3 4 5_0" />
      <Img pos={[-347, -89]} size={[152, 213]} scale={0.6} sprite="1 2 3 4 5_1" />

      {/* Empty-slot placeholders (inactive while their slot is filled). */}
      {SLOT_POS.map((pos, i) =>
        slots[i] === null ? (
          <Rect key={i} pos={pos} size={CARD_SIZE} scale={CARD_SCALE} data-drop={`slot${i}`}>
            <EmptySlot hovered={hoveredSlot === i} />
          </Rect>
        ) : null,
      )}

      {/* MetricGridDropTarget: transparent catch-all behind the grid cards. */}
      <Rect pos={[3.63, -465.27]} size={[853.25, 468.55]} data-drop="grid" />

      {CARDS.map((c) => {
        const slot = slots.indexOf(c.metric)
        const isDragged = drag?.metric === c.metric
        return (
          <Fragment key={c.metric}>
            <Img pos={c.home} size={CARD_SIZE} scale={CARD_SCALE} sprite="EmptyField" />
            <MetricCard
              metric={c.metric}
              label={t(c.label)}
              caption={c.caption}
              pos={slot >= 0 ? SLOT_POS[slot] : c.home}
              dropId={slot >= 0 ? `slot${slot}` : undefined}
              dragging={isDragged}
              displaced={slot >= 0 && slot === hoveredSlot && !isDragged}
              onClick={(m) => setSlots((s) => clickMetric(s, m))}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          </Fragment>
        )
      })}

      <BackButton onClick={() => setScreen('TopicSelection')} />
      <Button3D
        pos={[0, -840]}
        size={[750, 200]}
        label={t('Next')}
        disabled={!ready}
        onClick={() => {
          setMetrics([slots[0]!, slots[1]!])
          setScreen('AssignPositions')
        }}
      />

      {drag && dragCard && (
        <DragGhost x={drag.x} y={drag.y} w={CARD_SIZE[0] * CARD_SCALE} h={CARD_SIZE[1] * CARD_SCALE}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: CARD_SIZE[0], height: CARD_SIZE[1], transform: `scale(${CARD_SCALE})`, transformOrigin: '0 0' }}>
            <MetricCardFace label={t(dragCard.label)} caption={dragCard.caption} />
          </div>
        </DragGhost>
      )}
    </Screen>
  )
}
