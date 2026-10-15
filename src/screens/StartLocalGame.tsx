// Player-name registration for local play (Unity StartLocalGameController). The add-player
// input sits at the top of a scrolling list; each accepted name becomes a row with an inline
// edit field and a trash button. Names are trimmed and clamped to 12 characters, at most
// CONFIG.maxPlayers players. A case-insensitive duplicate name (typed in any field) swaps the
// instructions for the error text and disables Next.
import { useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { CONFIG } from '../game/config'
import { playerList } from '../game/model'
import { useGame } from '../game/store'
import type { Player } from '../game/types'
import { useT } from '../i18n'
import { BACK_BUTTON_BOTTOM, BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { useButton } from '../ui/useButton'
import { TmpInput } from './startLocal/TmpInput'
import { useCenterPivotScroll } from './startLocal/useCenterPivotScroll'

/** Error-source id of the add-player input (player ids are ≥ 0). */
const DEFAULT_INPUT = -1

/** Content VerticalLayoutGroup padding. */
const PAD_TOP = 300
const PAD_BOTTOM = 500
/** How far the two-line instructions reach above the add-player field (centre 93 + half of 2 × 0.97em lines). */
const INSTRUCTIONS_ABOVE = 93 + 70 * 0.97
/** Field top that keeps the instructions clear of the back arrow when the list is scrolled to the top. */
const CLEAR_TOP = BACK_BUTTON_BOTTOM + 30 + INSTRUCTIONS_ABOVE

/**
 * Extra top padding so the instructions never sit under the back arrow (Unity overlapped them
 * once the list filled the screen). While the content is centred with room to spare it is 0,
 * so the phone layout is unchanged; it ramps in continuously as the list approaches the top.
 */
function useArrowClearance(viewport: RefObject<HTMLDivElement | null>, list: RefObject<HTMLDivElement | null>) {
  const [extra, setExtra] = useState(0)
  useLayoutEffect(() => {
    const vp = viewport.current
    const el = list.current
    if (!vp || !el) return
    const need = Math.max(0, CLEAR_TOP - PAD_TOP)
    const update = () => {
      // Space left around the centred content without any extra padding.
      const free = vp.clientHeight - (PAD_TOP + el.offsetHeight + PAD_BOTTOM)
      setExtra(free >= 2 * need ? 0 : free >= need ? 2 * need - free : need)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(vp)
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewport, list])
  return extra
}

const clampName = (name: string) => name.trim().slice(0, CONFIG.maxNameLength)

/** Case-insensitive clash with any registered player except `excludeId` (reads live store state). */
function isDuplicateName(name: string, excludeId = -1) {
  if (!name) return false
  const upper = name.toUpperCase()
  return playerList(useGame.getState().game).some((p) => p.id !== excludeId && p.name.toUpperCase() === upper)
}

const playerCount = () => Object.keys(useGame.getState().game.players).length
const playerExists = (id: number) => id in useGame.getState().game.players

export function StartLocalGame() {
  const t = useT()
  const players = useGame((s) => s.game.players)
  const setScreen = useGame((s) => s.setScreen)
  const addPlayer = useGame((s) => s.addPlayer)
  const renamePlayer = useGame((s) => s.renamePlayer)
  const removePlayer = useGame((s) => s.removePlayer)

  // ReorderEntries: rows sorted by player id.
  const list = Object.values(players).sort((a, b) => a.id - b.id)
  const count = list.length

  // Field ids currently flagging a duplicate name; starts empty on every visit (OnEnable).
  const [errors, setErrors] = useState<ReadonlySet<number>>(new Set())
  const setError = (source: number, on: boolean) =>
    setErrors((prev) => {
      if (prev.has(source) === on) return prev
      const next = new Set(prev)
      if (on) next.add(source)
      else next.delete(source)
      return next
    })
  const anyError = errors.size > 0

  const [draft, setDraft] = useState('')

  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const onScroll = useCenterPivotScroll(viewport, content)
  const nameList = useRef<HTMLDivElement>(null)
  const clearance = useArrowClearance(viewport, nameList)

  const onDefaultChange = (value: string) => {
    setDraft(value)
    setError(DEFAULT_INPUT, value.trim() !== '' && isDuplicateName(clampName(value)))
  }

  /** OnDefaultInputEndEdit. Returns true to keep the field focused after Enter. */
  const onDefaultEndEdit = (value: string) => {
    if (!value.trim()) {
      setError(DEFAULT_INPUT, false)
      return false
    }
    if (playerCount() >= CONFIG.maxPlayers) return false
    const name = clampName(value)
    if (isDuplicateName(name)) return false
    setError(DEFAULT_INPUT, false)
    addPlayer(name)
    setDraft('')
    return playerCount() < CONFIG.maxPlayers
  }

  const deletePlayer = (id: number) => {
    if (!playerExists(id)) return
    removePlayer(id)
    setError(id, false)
  }

  const onEntryChange = (id: number, value: string) =>
    setError(id, value.trim() !== '' && isDuplicateName(clampName(value), id))

  /** OnPlayerNameEdited: empty deletes the player; a duplicate is left unsaved (error stays). */
  const onEntryEndEdit = (id: number, value: string) => {
    if (!playerExists(id)) return
    if (!value.trim()) return deletePlayer(id)
    const name = clampName(value)
    if (isDuplicateName(name, id)) return
    renamePlayer(id, name)
    setError(id, false)
  }

  return (
    <Screen>
      {/* Scroll View → Viewport → Content (VerticalLayoutGroup pad top 300 / bottom 500, pivot 0.5) */}
      <div ref={viewport} className="scroll-y" style={{ position: 'absolute', inset: 0 }} onScroll={onScroll}>
        <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            ref={content}
            style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${PAD_TOP + clearance}px 0 ${PAD_BOTTOM}px` }}
          >
            {/* NameInputs: VerticalLayoutGroup spacing 50, UpperCenter */}
            <div ref={nameList} style={{ width: 878.87, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
              {count < CONFIG.maxPlayers && (
                <NameInput
                  value={draft}
                  placeholder={t('Enter_Name')}
                  instructions={t('Enter_Name_Directions')}
                  error={anyError ? t('Name_Input_Error') : null}
                  onChange={onDefaultChange}
                  onEndEdit={onDefaultEndEdit}
                />
              )}
              {list.map((p) => (
                <PlayerEntry
                  key={p.id}
                  player={p}
                  placeholder={t('Enter_Name')}
                  onChange={(v) => onEntryChange(p.id, v)}
                  onEndEdit={(v) => onEntryEndEdit(p.id, v)}
                  onDelete={() => deletePlayer(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Unity has it outside the scroll view; here it scrolls with the content. */}
          <BackButton onClick={() => setScreen('PackSelection')} />
        </div>
      </div>

      <Button3D
        pos={[0, -750]}
        size={[750, 200]}
        label={t('Next')}
        disabled={count < CONFIG.minPlayers || anyError}
        onClick={() => setScreen('AssignGroups')}
      />
    </Screen>
  )
}

/** Tapping the field's frame (border, icon) focuses it, like a TMP_InputField raycast target. */
const focusOnFrameClick = (input: RefObject<HTMLInputElement | null>) => (e: MouseEvent) => {
  if (e.target !== input.current) input.current?.focus()
}

/** The add-player field ("NameInput") with the instructions / error text floating above it. */
function NameInput({ value, placeholder, instructions, error, onChange, onEndEdit }: {
  value: string
  placeholder: string
  instructions: string
  error: string | null
  onChange: (v: string) => void
  onEndEdit: (v: string) => boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <Rect flow size={[800, 133.28]} onClick={focusOnFrameClick(input)}>
      {error === null ? (
        <Text a={[0, 1, 0, 1]} pos={[393.18, 93]} size={[886.35, 87.54]} fontSize={70} color="#424242FF">
          {instructions}
        </Text>
      ) : (
        <Text a={[0, 1, 0, 1]} pos={[400, 93]} size={[900, 87.54]} fontSize={70} color="#FF0000FF">
          {error}
        </Text>
      )}
      <Img a={STRETCH} size={[-10, -10]} sprite="Button Background Square" color="#F2F2F2FF" sliced ppu={1.2} spritePpu={180} />
      <Img a={STRETCH} sprite="Button Border Pressed Square" color="#424242FF" sliced ppu={1.2} spritePpu={180} />
      <Rect a={STRETCH} pos={[0, -0.5]} size={[-80, -13]} style={{ overflow: 'hidden' }}>
        <TmpInput
          inputRef={input}
          value={value}
          onChange={onChange}
          onEndEdit={onEndEdit}
          placeholder={placeholder}
          placeholderColor="#32323280"
          fontSize={72}
          maxLength={CONFIG.maxNameLength}
        />
      </Rect>
    </Rect>
  )
}

/** "PlayerEntry" prefab: editable name field with an edit icon, over a kick (trash) button. */
function PlayerEntry({ player, placeholder, onChange, onEndEdit, onDelete }: {
  player: Player
  placeholder: string
  onChange: (v: string) => void
  onEndEdit: (v: string) => void
  onDelete: () => void
}) {
  // The field keeps exactly what was typed (Unity doesn't write the clamped name back).
  const [text, setText] = useState(player.name)
  const input = useRef<HTMLInputElement>(null)
  return (
    <Rect flow size={[736.97, 130.14]}>
      <KickButton onClick={onDelete} />
      <Img a={STRETCH} pos={[-66.68, 0]} size={[-79.66, -10]} sprite="Button Background Default" color="#FFFFFFFF" sliced ppu={1.2} spritePpu={180} />
      <Rect a={STRETCH} pos={[-68.95, 0]} size={[-75.12, 0]} onClick={focusOnFrameClick(input)}>
        <Img sprite="Button Border Pressed Default" color="#282828FF" sliced ppu={1.2} spritePpu={180} />
        <Rect a={STRETCH} pos={[10, 0]} size={[-60, 0]} style={{ overflow: 'hidden' }}>
          <TmpInput
            inputRef={input}
            value={text}
            onChange={(v) => {
              setText(v)
              onChange(v)
            }}
            onEndEdit={(v) => onEndEdit(v)}
            placeholder={placeholder}
            placeholderColor="#32323280"
            fontSize={72}
            maxLength={CONFIG.maxNameLength}
          />
        </Rect>
        <Img pos={[264, 0]} size={[69, 70]} scale={0.7} sprite="edit_icon" color="#282828FF" />
      </Rect>
    </Rect>
  )
}

/** "KickContainer": a ColorTint button whose tint target is only the trash icon. */
function KickButton({ onClick }: { onClick: () => void }) {
  const { visual, handlers } = useButton({ onClick })
  const tint = visual === 'pressed' ? 0xc8 / 255 : visual === 'highlighted' ? 0xf5 / 255 : 1
  return (
    <Rect pos={[264.65, 0]} size={[207.67, 130.14]} {...handlers} style={{ cursor: 'pointer' }}>
      <Img a={STRETCH} sprite="Button Background Square" color="#414141FF" sliced ppu={1.2} spritePpu={140} />
      <Img a={STRETCH} sprite="Button Border Pressed Square" color="#282828FF" sliced ppu={1.2} spritePpu={180} />
      <Img
        pos={[43, 0]}
        size={[65, 75]}
        scale={0.7}
        sprite="trash_icon"
        color="#F5F5F5FF"
        style={{ filter: tint < 1 ? `brightness(${tint})` : undefined, transition: 'filter 0.1s linear' }}
      />
    </Rect>
  )
}
