// Drag-and-drop group assignment (Unity AssignGroupsController). A fixed Discussion Moderator
// slot, the debate groups (editable names, "Group N" placeholders), a ghost group at the
// bottom that becomes a real group when a card is dropped on it, and an unassigned area for
// players added since the last visit. The layout model lives in assignGroups/board.ts and is
// persisted in the store (Unity kept its built hierarchy between visits).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGame } from '../game/store'
import { useLocalized, useT } from '../i18n'
import { BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { DragGhost } from '../ui/DragLayer'
import { dropTargetAt, toStagePoint, useDragGesture, type DragPoint } from '../ui/drag'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { useButton } from '../ui/useButton'
import {
  buildBoard,
  dropCard,
  effectiveName,
  hasDuplicateNames,
  isLayoutValid,
  rebuildBoard,
  shuffleBoard,
  soloBoard,
  toLayout,
  type Board,
  type DropId,
} from './assignGroups/board'
import { TmpInput } from './startLocal/TmpInput'

const CARD_SIZE = [815.59, 134.12] as const
/** AssignGroupsController.HighlightTint — replaces the hovered container image's colour. */
const HIGHLIGHT = '#CCF2FFFF'
const FRAME_COLOR = '#282828FF'
const GROUP_NAME_LIMIT = 12

const playerIds = () => Object.keys(useGame.getState().game.players).map(Number)

export function AssignGroups() {
  const t = useT()
  const players = useGame((s) => s.game.players)
  const setScreen = useGame((s) => s.setScreen)
  const setGroupsLayout = useGame((s) => s.setGroupsLayout)
  const commitGroups = useGame((s) => s.commitGroups)
  const header = useLocalized('Assign Groups', 'Úthluta Hópum')
  const label = (n: number) => t('GroupN', n)

  // OnEnable: first visit builds a fresh layout, later visits rebuild the saved one.
  const [board, setBoard] = useState<Board>(() => {
    const saved = useGame.getState().groupsLayout
    return saved ? rebuildBoard(saved, playerIds()) : buildBoard(playerIds())
  })
  useEffect(() => setGroupsLayout(toLayout(board)), [board, setGroupsLayout])

  const viewport = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)

  // Fresh builds (Shuffle / All Solo) reset the scroll to the top (ForceLayoutRebuild).
  const rebuild = (next: Board) => {
    setBoard(next)
    viewport.current?.scrollTo({ top: 0 })
  }

  // ---- drag & drop (DragHandle → OnCardDragUpdate / OnCardDrop)
  const [drag, setDrag] = useState<{ pid: number; x: number; y: number } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const stagePoint = (p: DragPoint) => toStagePoint(p, root.current!)
  const dragCallbacks = (pid: number) => ({
    onDragStart: (p: DragPoint) => setDrag({ pid, ...stagePoint(p) }),
    onDragMove: (p: DragPoint) => {
      setDrag({ pid, ...stagePoint(p) })
      setHover(dropTargetAt(p))
    },
    onDragEnd: (p: DragPoint) => {
      setBoard((b) => dropCard(b, pid, dropTargetAt(p) as DropId | null))
      setDrag(null)
      setHover(null)
    },
  })

  const nameOf = (pid: number) => players[pid]?.name ?? ''
  const card = (pid: number) => <NameCard key={pid} name={nameOf(pid)} dragging={drag?.pid === pid} {...dragCallbacks(pid)} />

  const duplicate = hasDuplicateNames(board, label)
  const canStart = isLayoutValid(board) && !duplicate

  const setGroupName = (key: number, name: string) =>
    setBoard((b) =>
      b.ghost.key === key ? { ...b, ghost: { ...b.ghost, name } } : { ...b, groups: b.groups.map((g) => (g.key === key ? { ...g, name } : g)) },
    )

  const start = () => {
    // A one-player group with no typed name is named after its player.
    const names = board.groups.map((g, i) => (g.playerIds.length === 1 && !g.name.trim() ? nameOf(g.playerIds[0]) : effectiveName(g, label(i + 1))))
    commitGroups(toLayout(board), names)
  }

  return (
    <Screen>
      <div ref={root} style={{ position: 'absolute', inset: 0 }}>
        <div ref={viewport} className="scroll-y" style={{ position: 'absolute', inset: 0 }}>
          {/* Content: VerticalLayoutGroup pad top 300 / bottom 500, spacing 70, UpperCenter */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '300px 0 500px', gap: 70 }}>
            <Rect flow size={[900, 200]}>
              <Img sprite={header} preserve />
            </Rect>

            {duplicate && (
              <Text flow size={[836.9, 153.24]} fontSize={60} color="#FF2323FF">
                {t('Name_Input_Error')}
              </Text>
            )}

            {/* Shuffle Buttons: HorizontalLayoutGroup spacing 40, UpperCenter (labels aren't localized in Unity) */}
            <div style={{ width: 800, height: 150.83, flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 40 }}>
              <SmallButton label="Shuffle " onClick={() => rebuild(shuffleBoard(playerIds()))} />
              <SmallButton label="All Solo" onClick={() => rebuild(soloBoard(board, playerIds()))} />
            </div>

            {/* Group List: VerticalLayoutGroup spacing 50, UpperCenter */}
            <div style={{ width: 878.87, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
              <GroupFrame drop="dm" highlighted={hover === 'dm'}>
                <Text flow size={[498.17, 50]} fontSize={55} color="#282828FF" align="TopLeft" margin={[25.512, 4.784, 0, 0]}>
                  {t('DiscussionModerator')}
                </Text>
                {board.dm !== null ? card(board.dm) : <EmptySlot />}
              </GroupFrame>

              {board.groups.map((g, i) => (
                <GroupFrame key={g.key} drop={`g${g.key}`} highlighted={hover === `g${g.key}`}>
                  <GroupName value={g.name} placeholder={label(i + 1)} onChange={(v) => setGroupName(g.key, v)} />
                  {g.playerIds.map(card)}
                </GroupFrame>
              ))}

              <GroupFrame key={board.ghost.key} drop="ghost" highlighted={hover === 'ghost'}>
                <GroupName value={board.ghost.name} placeholder={label(board.groups.length + 1)} onChange={(v) => setGroupName(board.ghost.key, v)} />
                <EmptySlot />
              </GroupFrame>
            </div>

            {/* Unassigned: no Image in Unity, so only its cards catch drops and it never highlights. */}
            <div
              data-drop="unassigned"
              style={{ width: 878.87, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50, pointerEvents: 'none' }}
            >
              {board.unassigned.map(card)}
            </div>

            {/* Unity has it outside the scroll view; here it scrolls with the content. */}
            <BackButton onClick={() => setScreen('StartLocalGame')} />
          </div>
        </div>

        <Button3D pos={[0, -750]} size={[750, 200]} label={t('Start')} disabled={!canStart} onClick={start} />

        {drag && (
          <DragGhost x={drag.x} y={drag.y} w={CARD_SIZE[0]} h={CARD_SIZE[1]} opacity={0.7}>
            <CardVisual name={nameOf(drag.pid)} />
          </DragGhost>
        )}
      </div>
    </Screen>
  )
}

/** "Shuffle Players" / "Solo Players": Button Default at 350×143.63 (3D border 150 tall, top-anchored). */
function SmallButton({ label, onClick }: { label: string; onClick: () => void }) {
  // The flow box is the 150-tall 3D border; face/outline/text are re-expressed relative to it.
  return (
    <Button3D
      flow
      size={[350, 150]}
      spritePpu={140}
      face={{ pos: [0, 3.185], size: [-10, -16.37] }}
      outline={{ pos: [0, 5.685], size: [0, -11.37] }}
      textRect={{ pos: [0, 8.765], size: [0, -17.54] }}
      text={{ fontSize: 75, auto: undefined, margin: [0, 0, 0, 0] }}
      label={label}
      onClick={onClick}
    />
  )
}

/** "Group Prefab" / "Group Display Prefab": framed VerticalLayoutGroup (pad L2 R40 T2 B40, spacing 30, UpperLeft). */
function GroupFrame({ drop, highlighted, children }: { drop: DropId; highlighted: boolean; children: ReactNode }) {
  return (
    <div
      data-drop={drop}
      style={{
        position: 'relative',
        width: 880,
        flex: 'none',
        boxSizing: 'border-box',
        padding: '2px 40px 40px 2px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 30,
      }}
    >
      <Img sprite="Button Border Pressed Square" color={highlighted ? HIGHLIGHT : FRAME_COLOR} sliced ppu={1.5} spritePpu={180} />
      {children}
    </div>
  )
}

/** "Group Name Container": name field + Edit button (which just focuses the field). */
function GroupName({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const edit = useButton({ onClick: () => input.current?.focus() })
  return (
    <Rect flow size={[486.31, 100]}>
      <Img sprite="Rectangle 95" color="#282828FF" sliced spritePpu={180} />
      <Rect a={[1, 0, 1, 1]} pos={[-62.82, 0]} size={[121.52, 0]} {...edit.handlers} style={{ cursor: 'pointer' }}>
        <Img a={STRETCH} pos={[-0.36, 1.82]} size={[-10.73, -13.63]} sprite="Rectangle 7" color="#424242FF" sliced ppu={2} spritePpu={180} />
        <Img a={[1, 0.5, 1, 0.5]} pos={[-45.5, 0]} size={[76, 76]} scale={0.6} sprite="edit_icon" />
      </Rect>
      <Rect a={STRETCH} pos={[-45.12, 1.82]} size={[-99.76, -13.63]} onClick={(e) => {
          if (e.target !== input.current) input.current?.focus()
        }}>
        <Img sprite="Rectangle 7" color="#FFFFFFFF" sliced spritePpu={180} />
        <Rect a={STRETCH} pos={[1.81, -0.5]} size={[-23.61, -13]} style={{ overflow: 'hidden' }}>
          <TmpInput
            inputRef={input}
            value={value}
            onChange={onChange}
            onEndEdit={() => {}}
            placeholder={placeholder}
            placeholderColor="#323232C8"
            fontSize={72}
            maxLength={GROUP_NAME_LIMIT}
          />
        </Rect>
      </Rect>
    </Rect>
  )
}

/** "Empty Input Field" placeholder shown in an empty DM slot and the ghost group. */
function EmptySlot() {
  return (
    <Rect flow size={[601.75, 100]}>
      <Img pos={[33.38, 0]} size={[535, 100]} sprite="Drag & Drop Empty" sliced spritePpu={200} />
    </Rect>
  )
}

/** "Name In Group Prefab Moveable" visuals (shared by the card and its drag ghost). */
function CardVisual({ name }: { name: string }) {
  return (
    <>
      <Img a={STRETCH} pos={[272.8, 0]} size={[-495.66, -10]} sprite="Button Background Square" color="#424242FF" sliced ppu={1.4} spritePpu={180} />
      <Img a={STRETCH} pos={[272.78, 0]} size={[-491.88, 0]} sprite="Button Border Pressed Square" color="#282828FF" sliced ppu={1.4} spritePpu={180} />
      <Img a={STRETCH} pos={[-22.02, 0]} size={[-154.79, -10]} sprite="Button Background Default" color="#D9D9D9FF" sliced ppu={1.1} spritePpu={180} />
      <Img a={STRETCH} pos={[-22.06, 0]} size={[-144.89, 0]} sprite="Button Border Pressed Default" color="#424242FF" sliced ppu={1.1} spritePpu={180} />
      <Text a={STRETCH} pos={[-38.42, 0]} size={[-177.61, 0]} fontSize={72} auto={[18, 72]} color="#414141FF">
        {name}
      </Text>
      <Img a={[1, 0.5, 1, 0.5]} pos={[-45.4, 0]} size={[56.41, 102]} scale={0.7} sprite="drag_icon_0" />
    </>
  )
}

/** A draggable name card; while dragged it fades to 0.4 and a 0.7-alpha ghost follows the pointer. */
function NameCard({ name, dragging, onDragStart, onDragMove, onDragEnd }: {
  name: string
  dragging: boolean
  onDragStart: (p: DragPoint) => void
  onDragMove: (p: DragPoint) => void
  onDragEnd: (p: DragPoint) => void
}) {
  const gesture = useDragGesture({ onDragStart, onDragMove, onDragEnd })
  return (
    <Rect
      flow
      size={CARD_SIZE}
      {...gesture}
      style={{ ...gesture.style, pointerEvents: 'auto', opacity: dragging ? 0.4 : 1, cursor: 'grab' }}
    >
      <CardVisual name={name} />
    </Rect>
  )
}
