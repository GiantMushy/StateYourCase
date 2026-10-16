// DM objective card (redesign of Unity's "Corruption Card" / CorruptionCardController): a
// chunky card in the objective type's colours with the player's name, the objective type, the
// description, and a points toggle the DM taps when the objective is achieved.
// Achieving it stamps the check in and gives the card a jiggle that grows with the objective's
// points. The card grows with its description. Once the player is caught (Player.isAccused) the
// card drains to grey, the toggle locks and a "Stolen Points" stamp slams onto it.
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import * as M from '../../game/model'
import { useGame } from '../../game/store'
import type { Corruption, CorruptionType, Player } from '../../game/types'
import { useLang, useT } from '../../i18n'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { buttonTransition, useButton, type StateDurations } from '../../ui/useButton'
import { TEXT_COLOR, TYPE_LABEL } from '../corruption/style'

const CARD_W = 800
/** Card height without description text; the description sits below the header. */
const DESC_TOP = 158
const DESC_PAD_BOTTOM = 40
const CARD_MIN_H = 300
/** 3D lip under the card and under the toggle. */
/** The border sprite's own 3D lip (16 sprite px) at the card's ppu; the face stops above it. */
const LIP = (16 * 100) / (180 * 0.8)
const PILL = { x: 548, y: 22, w: 222, h: 104 }
const PILL_SINK = 6
/** Thin outlines on the toggle (higher pixels-per-unit = thinner border, tighter corners). */
const PILL_PPU = 1.6
const PILL_LIP = (16 * 100) / (180 * PILL_PPU)
const DURATIONS: StateDurations = { normal: 0.08, highlighted: 0.05, pressed: 0.05, selected: 0.05, disabled: 0 }

/** The cards' colours: face and edge from the Unity card sprites, accent = Inspector toggle colour. */
const PALETTE: Record<CorruptionType, { face: string; edge: string; accent: string }> = {
  Speech: { face: '#23D45AFF', edge: '#019406FF', accent: '#60FB8DFF' },
  Interruption: { face: '#6323DEFF', edge: '#3D00A6FF', accent: '#8853EFFF' },
  Betrayal: { face: '#D13839FF', edge: '#8C0C0CFF', accent: '#F26B6BFF' },
  Civilian: { face: '#8CD8D6FF', edge: '#019406FF', accent: '#60FB8DFF' },
}
const STAMP_RED = '#E0073F'

/** Objective points range (Corruptions.csv): the celebration scales between these. */
const POINTS_MIN = 40
const POINTS_MAX = 180
const intensityOf = (points: number) => Math.max(0, Math.min(1, (points - POINTS_MIN) / (POINTS_MAX - POINTS_MIN)))

/** Top-left box in card coordinates (y down) as Rect props. */
const box = (x: number, y: number, w: number, h: number): RectProps => ({ a: [0, 1, 0, 1], pivot: [0, 1], pos: [x, -y], size: [w, h] })
const hex = (c: string) => c.slice(0, 7)

export function ObjectiveCard({ player, corruption }: { player: Player; corruption: Corruption }) {
  const t = useT()
  const lang = useLang()
  const update = useGame((s) => s.update)
  const completed = useGame((s) => M.isCompleted(s.game, corruption.id))

  const stolen = player.isAccused
  const ink = TEXT_COLOR[corruption.type]
  const pal = PALETTE[corruption.type]
  const description = lang === 'is' && corruption.descriptionIs ? corruption.descriptionIs : corruption.description
  const k = intensityOf(corruption.points)

  const cardRef = useRef<HTMLDivElement>(null)
  const checkRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const stampRef = useRef<HTMLDivElement>(null)

  // Animate changes only (not the state a card mounts with, e.g. switching tabs).
  const prev = useRef({ completed, stolen })
  useLayoutEffect(() => {
    const was = prev.current
    prev.current = { completed, stolen }
    if (stolen && !was.stolen) slamStamp(stampRef.current, cardRef.current)
    else if (completed && !was.completed) celebrate(k, cardRef.current, checkRef.current, pillRef.current)
    else if (!completed && was.completed && !stolen) retract(checkRef.current, pillRef.current)
  }, [completed, stolen, k])

  const { visual, handlers } = useButton({ onClick: () => update((g) => M.setCorruptionCompleted(g, player.id, !completed)), disabled: stolen })
  const down = visual === 'pressed'
  const capMove: CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translateY(${down ? PILL_SINK : 0}px)`,
    transition: buttonTransition('transform', DURATIONS[visual], visual),
  }
  const on = completed && !stolen

  return (
    <div style={{ position: 'relative', width: CARD_W, flex: 'none' }}>
      <div ref={cardRef} style={{ position: 'relative' }}>
        {/* Everything but the stamp drains to grey once the points are stolen. */}
        <div style={{ position: 'relative', minHeight: CARD_MIN_H, filter: stolen ? 'grayscale(1) brightness(0.92)' : 'none', opacity: stolen ? 0.7 : 1, transition: 'filter 0.5s ease-out, opacity 0.5s ease-out' }}>
          <Img a={STRETCH} pos={[0, LIP / 2]} size={[0, -LIP]} sprite="Button Background Sharp" color={pal.face} sliced ppu={0.8} spritePpu={180} />
          <Img sprite="Button Border Sharp" color={pal.edge} sliced ppu={0.8} spritePpu={180} />

          <Text {...box(36, 18, PILL.x - 56, 66)} auto={[34, 60]} color={ink} align="MidlineLeft" nowrap>
            {player.name}
          </Text>
          <Text
            {...box(36, 84, PILL.x - 56, 40)}
            fontSize={34}
            color={ink}
            align="MidlineLeft"
            nowrap
            style={{ opacity: 0.75 }}
            textStyle={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {t(TYPE_LABEL[corruption.type])}
          </Text>
          <Rect {...box(30, 142, CARD_W - 60, 5)} style={{ background: hex(pal.edge), borderRadius: 3, opacity: 0.55 }} />
          <div
            style={{
              position: 'relative',
              padding: `${DESC_TOP}px 36px ${DESC_PAD_BOTTOM + LIP}px`,
              fontFamily: 'Iceland, sans-serif',
              fontSize: 44,
              lineHeight: 54.32 / 56,
              color: hex(ink),
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              pointerEvents: 'none',
            }}
          >
            {description}
          </div>

          {/* Points toggle: a deck-style key with the points and a checkbox. */}
          <Rect ref={pillRef} {...box(PILL.x, PILL.y, PILL.w, PILL.h)} {...handlers} style={{ cursor: stolen ? 'default' : 'pointer' }}>
            <div style={capMove}>
              <Img
                a={STRETCH}
                pos={[0, PILL_LIP / 2]}
                size={[0, -PILL_LIP]}
                sprite="Button Background Sharp"
                color={on ? '#F5F5F5FF' : pal.accent}
                sliced
                ppu={PILL_PPU}
                spritePpu={180}
                style={{ filter: visual === 'highlighted' ? 'brightness(1.08)' : undefined, transition: 'filter 0.25s ease-out' }}
              />
              <Img sprite="Button Border Sharp" color={pal.edge} sliced ppu={PILL_PPU} spritePpu={180} />
              <Text
                {...box(12, 0, 112, PILL.h - PILL_LIP)}
                auto={[36, 54]}
                color={on ? hex(pal.edge) + 'FF' : ink}
                align="Right"
                nowrap
                textStyle={stolen ? { textDecoration: 'line-through', textDecorationThickness: 5 } : undefined}
              >
                {`${corruption.points}`}
                <span style={{ fontSize: '0.5em', marginLeft: 6 }}>{t('Points_abbreviated')}</span>
              </Text>
              {/* Checkbox */}
              <Rect {...box(140, 14, 66, 66)}>
                <Img sprite="Button Background Sharp" color={on ? pal.accent : '#FFFFFF55'} sliced ppu={2} spritePpu={180} />
                <Img sprite="Button Border Sharp" color={pal.edge} sliced ppu={2} spritePpu={180} />
                {stolen ? (
                  <Img pos={[0, 2]} size={[46, 46]} sprite="Lock" color={pal.edge} />
                ) : (
                  <div ref={checkRef} style={{ position: 'absolute', inset: 0, opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(0)' }}>
                    <Img pos={[0, 3]} size={[52, 39]} sprite="check_0" color={pal.edge} />
                  </div>
                )}
              </Rect>
            </div>
          </Rect>
        </div>

        {stolen && (
          <div ref={stampRef} style={{ position: 'absolute', left: 0, right: 0, top: 168, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
              style={{
                transform: 'rotate(-8deg)',
                border: `9px solid ${STAMP_RED}`,
                borderRadius: 22,
                padding: '6px 34px 10px',
                background: 'rgba(245, 245, 245, 0.88)',
                boxShadow: '0 8px 0 rgba(40, 40, 40, 0.25)',
              }}
            >
              <Text flow size={[420, 90]} fontSize={84} color={STAMP_RED + 'FF'} smallCaps nowrap>
                {t('StolenPoints')}
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- effects

function celebrate(k: number, card: HTMLElement | null, check: HTMLElement | null, pill: HTMLElement | null) {
  // Check stamps in with an overshoot.
  check?.animate(
    [
      { transform: 'scale(0) rotate(-35deg)', opacity: 0 },
      { transform: `scale(${1.45 + 0.45 * k}) rotate(8deg)`, opacity: 1, offset: 0.55 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    ],
    { duration: 380, easing: 'ease-out' },
  )
  pill?.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.08 + 0.06 * k})` }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' })
  // Card pop with a wobble that grows with the points.
  const s = 1.015 + 0.035 * k
  const r = 0.6 + 1.8 * k
  card?.animate(
    [
      { transform: 'scale(1) rotate(0deg)' },
      { transform: `scale(${s}) rotate(${-r}deg)`, offset: 0.3 },
      { transform: `scale(${1 + (s - 1) * 0.4}) rotate(${r * 0.6}deg)`, offset: 0.6 },
      { transform: 'scale(1) rotate(0deg)' },
    ],
    { duration: 420 + 180 * k, easing: 'ease-out' },
  )
}

function retract(check: HTMLElement | null, pill: HTMLElement | null) {
  check?.animate(
    [
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'scale(0) rotate(35deg)', opacity: 0 },
    ],
    { duration: 200, easing: 'ease-in' },
  )
  pill?.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
    { duration: 260, easing: 'ease-out' },
  )
}

/** The "Stolen Points" stamp slams down and the card jolts. */
function slamStamp(stamp: HTMLElement | null, card: HTMLElement | null) {
  stamp?.animate(
    [
      { transform: 'scale(2.4)', opacity: 0 },
      { transform: 'scale(0.94)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: 320, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
  )
  card?.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(0)', offset: 0.6 }, { transform: 'translateY(10px) scale(0.99)', offset: 0.75 }, { transform: 'translateY(0)' }],
    { duration: 420, easing: 'ease-out' },
  )
}

/** "No Corruptions Card": an empty dashed slot, like the voting slots and the tape rack. */
export function NoCorruptionsCard() {
  return (
    <Rect flow size={[CARD_W, 200]}>
      <div style={{ position: 'absolute', inset: 0, border: '6px dashed #282828', borderRadius: 34, background: 'rgba(255, 255, 255, 0.15)' }} />
      {/* No LocalizeStringEvent in the prefab: the same (misspelt) text in both languages. */}
      <Text fontSize={60} color="#282828FF" margin={[40, 0, 40, 0]}>
        No Active Curruptions
      </Text>
    </Rect>
  )
}
