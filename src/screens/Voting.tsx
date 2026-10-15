// "Cast your Votes" (Unity VotingController). Group phase: the voting group ranks the
// other groups into slots 1/2/3. DM phase: the DM picks a group for each of the two
// selected metrics; the same group may fill both slots, via a clone that appears at the
// card's grid home whenever an original enters a slot. Cards are clicked (grid <-> first
// free slot) or dragged onto slots / the grid. Slot bookkeeping lives in voting/ballot.ts.
import { produce } from 'immer'
import { useRef, useState, type PointerEvent } from 'react'
import * as M from '../game/model'
import { useGame } from '../game/store'
import type { Metric } from '../game/types'
import { useLocalized, useT } from '../i18n'
import { Button3D } from '../ui/Button3D'
import { DragGhost } from '../ui/DragLayer'
import { toStagePoint, useDragGesture, type DragPoint } from '../ui/drag'
import { EmptySlot } from '../ui/EmptySlot'
import { Img } from '../ui/Img'
import { spriteInfo } from '../ui/sprites'
import { Rect, STRETCH, type V2 } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { useButton } from '../ui/useButton'
import { clickCard, createBallot, isComplete, placeInSlot, returnToGrid, slotOf, type Ballot, type Card } from './voting/ballot'

const CARD_SIZE: V2 = [664, 220]
const CARD_SCALE = 0.6
/** Vote slot anchors (= the "First/Second/Third Vote Empty" placeholders). */
const SLOT_POS: V2[] = [[166, 311], [166, 127], [166, -56]]
/** Grid homes of the six "Group N" buttons; holes stay when a card leaves. */
const HOME_POS: V2[] = [[-210, -312], [223, -312], [-210, -463], [223, -463], [-206, -614], [224, -611]]
/** Per-button scene values (clones copy their original's). Group 1's image is authored slightly grey. */
const CAPTION_MARGINS: (readonly [number, number, number, number])[] = [
  [17.38, 0, 24.332, 0],
  [20.856, 0, 20.856, 0],
  [27.808, 0, 27.808, 0],
  [24.332, 0, 34.76, 0],
  [24.332, 0, 27.808, 0],
  [24.332, 0, 27.808, 0],
]
const CARD_COLORS = ['#F5F5F5FF', '#FFFFFFFF', '#FFFFFFFF', '#FFFFFFFF', '#FFFFFFFF', '#FFFFFFFF']
/** VotingDragHandler.DisplacedTint and VotingSlotDropTarget.SlotHoverTint. */
const DISPLACED_TINT = '#D1D1D1FF'
/** Default ColorTint block on the card buttons. */
const HIGHLIGHTED = 0xf5 / 255
const PRESSED = 0xc8 / 255

const METRIC_SPRITES: Record<Metric, string> = {
  Comedy: 'Comedy',
  Creativity: 'Creative',
  OnTopic: 'On Topic',
  Factual: 'Factual',
  Enthusiasm: 'Enthusiasm',
}

/**
 * Metric word image beside a DM slot. Unity squeezed whichever word was chosen into a fixed
 * per-slot box (stretching it); here every word is drawn at its native aspect and the same
 * 0.6 scale, so all labels share one letter size.
 */
function MetricLabel({ metric, y }: { metric: Metric; y: number }) {
  const sprite = METRIC_SPRITES[metric]
  const { w, h } = spriteInfo(sprite)
  return <Img pos={[-266, y]} size={[w, h]} scale={0.6} sprite={sprite} />
}

/** Card visuals: background (the ColorTint target), caption, then the border on top. */
function CardVisual({ index, name, color, brightness = 1 }: { index: number; name: string; color: string; brightness?: number }) {
  return (
    <>
      <Img
        sprite="Button Background Default"
        color={color}
        sliced
        spritePpu={180}
        style={{ filter: brightness < 1 ? `brightness(${brightness})` : undefined, transition: 'filter 0.1s linear' }}
      />
      <Text fontSize={170} auto={[110, 170]} color="#323232FF" margin={CAPTION_MARGINS[index]}>
        {name}
      </Text>
      <Img sprite="Button Border Pressed Default" color="#282828FF" sliced spritePpu={180} />
    </>
  )
}

/**
 * Topmost drop target under the pointer, ignoring the dragged card itself (Unity sets its
 * CanvasGroup.blocksRaycasts = false) and the ghost. Grid cards carry no target, so the
 * Grid Area beneath them is found instead, matching VotingDragHandler's two-pass raycast.
 */
function dropTargetUnder(p: DragPoint, dragKey: string): string | null {
  for (const el of document.elementsFromPoint(p.clientX, p.clientY)) {
    if (el.closest('[data-drag-ghost]') || el.closest(`[data-card="${dragKey}"]`)) continue
    const target = el.closest<HTMLElement>('[data-drop]')
    if (target) return target.dataset.drop ?? null
  }
  return null
}

function VoteCard({ card, name, pos, slot, displaced, dragging, onClick, onDragMove, onDragEnd }: {
  card: Card
  name: string
  pos: V2
  slot: number
  displaced: boolean
  dragging: boolean
  onClick: () => void
  onDragMove: (p: DragPoint) => void
  onDragEnd: (p: DragPoint) => void
}) {
  const gesture = useDragGesture({ onClick, onDragStart: onDragMove, onDragMove, onDragEnd })
  // The card is also a Unity ColorTint Button (no onClick): hover / pressed brightness only.
  const { visual, handlers: tint } = useButton({})
  const brightness = dragging ? 1 : visual === 'pressed' ? PRESSED : visual === 'highlighted' ? HIGHLIGHTED : 1
  const both = (a: (e: PointerEvent) => void, b: (e: PointerEvent) => void) => (e: PointerEvent) => {
    a(e)
    b(e)
  }

  return (
    <Rect
      data-card={card.key}
      // A card sitting in a slot is itself a drop target for that slot (VotingSlotDropProxy).
      data-drop={slot >= 0 ? `slot:${slot + 1}` : undefined}
      pos={pos}
      size={CARD_SIZE}
      scale={CARD_SCALE}
      onPointerEnter={tint.onPointerEnter}
      onPointerLeave={tint.onPointerLeave}
      onPointerDown={both(tint.onPointerDown, gesture.onPointerDown)}
      onPointerMove={both(tint.onPointerMove, gesture.onPointerMove)}
      onPointerUp={both(tint.onPointerUp, gesture.onPointerUp)}
      onPointerCancel={both(tint.onPointerCancel, gesture.onPointerCancel)}
      style={{ ...gesture.style, cursor: 'pointer', opacity: dragging ? 0.4 : 1 }}
    >
      <CardVisual index={card.group} name={name} color={displaced ? DISPLACED_TINT : CARD_COLORS[card.group]} brightness={brightness} />
    </Rect>
  )
}

export function Voting() {
  const t = useT()
  const game = useGame((s) => s.game)
  const isDM = useGame((s) => s.isDMMetricVoting)
  const votingGroupId = useGame((s) => s.votingGroupOrder[s.votingGroupIndex])
  const submitGroupBallot = useGame((s) => s.submitGroupBallot)
  const submitMetricBallot = useGame((s) => s.submitMetricBallot)
  const header = useLocalized('Cast your Votes', 'Greiddu atkvæðið þitt')

  // SetupUI (OnEnable): groups by id, minus the voting group itself, at most six buttons.
  const [choices] = useState(() =>
    M.groupList(game)
      .filter((g) => isDM || g.id !== votingGroupId)
      .slice(0, HOME_POS.length),
  )
  const [ballot, setBallot] = useState<Ballot>(() => createBallot(choices.length, isDM))
  const [drag, setDrag] = useState<{ key: string; x: number; y: number } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const update = (fn: (b: Ballot) => void) => setBallot((b) => produce(b, fn))

  const moveDrag = (key: string, p: DragPoint) => {
    const sp = toStagePoint(p, rootRef.current!)
    setDrag({ key, x: sp.x, y: sp.y })
    setHover(dropTargetUnder(p, key))
  }
  const endDrag = (key: string, p: DragPoint) => {
    const target = dropTargetUnder(p, key)
    setDrag(null)
    setHover(null)
    // No target = ReturnToHome: the card simply snaps back to its logical position.
    if (target === 'grid') update((b) => returnToGrid(b, key))
    else if (target?.startsWith('slot:')) update((b) => placeInSlot(b, key, Number(target.slice(5))))
  }

  const next = () => {
    const ids = ballot.slots
      .slice(0, ballot.maxSelections)
      .map((key) => ballot.cards.find((c) => c.key === key))
      .filter((c): c is Card => !!c)
      .map((c) => choices[c.group].id)
    if (isDM) submitMetricBallot(ids)
    else submitGroupBallot(ids)
  }

  const metrics = game.selectedMetrics
  const hoveredSlot = hover?.startsWith('slot:') ? Number(hover.slice(5)) - 1 : -1
  const draggedCard = drag && ballot.cards.find((c) => c.key === drag.key)

  return (
    <Screen>
      <Rect a={STRETCH} ref={rootRef}>
        <Rect pos={[0, 658.64]} size={[1398.4, 483.17]} scale={0.7}>
          <Img sprite={header} preserve />
        </Rect>

        {!isDM && (
          <>
            <Img pos={[-140, 312]} size={[106, 208]} scale={0.6} sprite="1 2 3 4 5_0" />
            <Img pos={[-140, 128]} size={[152, 213]} scale={0.6} sprite="1 2 3 4 5_1" />
            {choices.length > 2 && <Img pos={[-140, -52.5]} size={[152, 213]} scale={0.6} sprite="1 2 3 4 5_2" />}
          </>
        )}
        {/* The metric images keep their authored rect sizes whichever sprite is swapped in. */}
        {isDM && metrics.length > 0 && <MetricLabel metric={metrics[0]} y={312} />}
        {isDM && metrics.length > 1 && <MetricLabel metric={metrics[1]} y={128} />}

        {/* Transparent raycast target: dropping here returns a card to the grid. */}
        <Rect data-drop="grid" pos={[10.81, -470.24]} size={[885.63, 496.48]} />

        {/* Empty-slot placeholders (also the slot drop targets), shown while vacant. */}
        {SLOT_POS.slice(0, ballot.maxSelections).map(
          (pos, i) =>
            ballot.slots[i] === null && (
              <Rect key={i} data-drop={`slot:${i + 1}`} pos={pos} size={CARD_SIZE} scale={CARD_SCALE}>
                <EmptySlot hovered={hoveredSlot === i} />
              </Rect>
            ),
        )}

        {ballot.cards.map((card) => {
          const slot = slotOf(ballot, card.key)
          return (
            <VoteCard
              key={card.key}
              card={card}
              name={choices[card.group].name}
              pos={slot >= 0 ? SLOT_POS[slot] : HOME_POS[card.group]}
              slot={slot}
              displaced={drag !== null && drag.key !== card.key && slot >= 0 && slot === hoveredSlot}
              dragging={drag?.key === card.key}
              onClick={() => update((b) => clickCard(b, card.key))}
              onDragMove={(p) => moveDrag(card.key, p)}
              onDragEnd={(p) => endDrag(card.key, p)}
            />
          )
        })}

        <Button3D pos={[0, -840]} size={[750, 200]} label={t('Next')} disabled={!isComplete(ballot)} onClick={next} />
      </Rect>

      {drag && draggedCard && (
        <DragGhost x={drag.x} y={drag.y} w={CARD_SIZE[0] * CARD_SCALE} h={CARD_SIZE[1] * CARD_SCALE}>
          <Rect size={CARD_SIZE} scale={CARD_SCALE}>
            <CardVisual index={draggedCard.group} name={choices[draggedCard.group].name} color={CARD_COLORS[draggedCard.group]} />
          </Rect>
        </DragGhost>
      )}
    </Screen>
  )
}
