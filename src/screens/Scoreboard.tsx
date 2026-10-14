// End-of-round score reveal (Unity ScoreboardController). One column per non-DM player with
// stacked bars bottom→top: old score (round 2+), group score, corruption + stolen. The phased
// animation lives in scoreboard/animation.ts; bars and counters are written imperatively.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as M from '../game/model'
import { useGame } from '../game/store'
import { useLocalized } from '../i18n'
import { useFrame } from '../ui/anim'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH, type V2 } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import {
  BAR_CONTAINER_HEIGHT,
  PIXELS_PER_POINT,
  buildRows,
  leadingRow,
  runScoreboardAnimation,
  type AnimValues,
} from './scoreboard/animation'

const MARKER_STEP = 50
const MARKER_LINE_HEIGHT = 8
/** VerticalLayoutGroup spacing is set so marker k sits at k × 50 points (99 units apart). */
const MARKER_PITCH = MARKER_STEP * PIXELS_PER_POINT
const LABELLED_MARKERS = [100, 200, 300, 400, 500]

const COLUMN_X0 = 100
const COLUMN_PITCH = 115
const BAR_WIDTH = 100
const SCORE_HEIGHT = 50
/** Sliced bar sprites have a 20-unit border on each end. */
const BAR_BORDER_SUM = 40
/** Old Score bar colours as authored per slot. */
const OLD_COLORS = ['#DF00F5FF', '#FF0000FF', '#FF0000FF', '#FF0000FF', '#FF0000FF', '#000000FF', '#000000FF']
const CROWN_POS: V2[] = [[-10, 21.4], [-10, 21.4], [-10, 21.4], [-10, 21.4], [-10, 21.4], [-10, 21.4], [45, 101.2]]
const CROWN_BOB_AMPLITUDE = 6
const CROWN_BOB_SPEED = 2.5
const LOSER_DIM_ALPHA = 0.5

/**
 * Sets a sliced bar's height. Below the summed border height Unity shrinks the vertical
 * borders proportionally (CSS border-box can't), so the sprite is drawn at 40 units and
 * squashed with scaleY instead.
 */
function setBarHeight(el: HTMLElement | null, h: number) {
  if (!el) return
  el.style.height = `${h}px`
  // The Img child is bottom-anchored; only its height and squash change.
  const img = el.firstElementChild as HTMLElement
  const squash = h < BAR_BORDER_SUM
  img.style.top = 'auto'
  img.style.height = squash ? `${BAR_BORDER_SUM}px` : '100%'
  img.style.transformOrigin = 'bottom'
  img.style.transform = squash ? `scaleY(${h / BAR_BORDER_SUM})` : ''
}

function Bar({ barRef, sprite, color }: { barRef: (el: HTMLDivElement | null) => void; sprite: string; color: string }) {
  return (
    <div ref={barRef} style={{ position: 'absolute', left: -(BAR_WIDTH - 90) / 2, width: BAR_WIDTH, bottom: 0, height: 0 }}>
      <Img sprite={sprite} color={color} sliced />
    </div>
  )
}

interface ColumnRefs {
  old: HTMLDivElement | null
  group: HTMLDivElement | null
  corr: HTMLDivElement | null
  score: HTMLDivElement | null
  total: HTMLSpanElement | null
  incrementer: HTMLDivElement | null
  lastTotal: number | null
}

export function Scoreboard() {
  const game = useGame((s) => s.game)
  const playTransition = useGame((s) => s.playTransition)
  const startNextRound = useGame((s) => s.startNextRound)
  const newGame = useGame((s) => s.newGame)
  const header = useLocalized({ sprite: 'Scoreboard', size: [1108, 215] as V2 }, { sprite: 'Stigatafla', size: [990, 270] as V2 })

  // OnEnable: rows, round and game-over are resolved once per visit.
  const [{ rows, round, gameOver, metrics }] = useState(() => ({
    rows: buildRows(game),
    round: game.currentRound,
    gameOver: M.isGameOver(game),
    metrics: game.selectedMetrics,
  }))
  const showOld = round > 1
  const [label, setLabel] = useState('')
  const [incrementers, setIncrementers] = useState<(string | null)[]>(() => rows.map(() => null))
  const [leader, setLeader] = useState(-1)
  const [winner, setWinner] = useState(-1)
  const cols = useRef<ColumnRefs[]>(
    rows.map(() => ({ old: null, group: null, corr: null, score: null, total: null, incrementer: null, lastTotal: null })),
  )
  const crownRef = useRef<HTMLDivElement>(null)

  // ApplyAllBarsAndCounters: stacked bars share one pixel budget (the 500 mark), so a player
  // past it stays pinned at the top while the counter keeps climbing.
  const apply = (v: AnimValues) => {
    cols.current.forEach((c, i) => {
      let budget = BAR_CONTAINER_HEIGHT
      const take = (points: number) => {
        const h = Math.min(Math.max(points * PIXELS_PER_POINT, 0), Math.max(0, budget))
        budget -= h
        return h
      }
      const oldH = take(v.old[i])
      const groupH = take(v.group[i])
      const corrH = take(v.corr[i])
      // The column is a reversed VerticalLayoutGroup: each child sits on top of the previous.
      const base = showOld ? oldH : 0
      setBarHeight(c.old, oldH)
      setBarHeight(c.group, groupH)
      setBarHeight(c.corr, corrH)
      if (c.group) c.group.style.bottom = `${base}px`
      if (c.corr) c.corr.style.bottom = `${base + groupH}px`
      const top = base + groupH + corrH
      if (c.score) c.score.style.bottom = `${top}px`
      if (c.incrementer) c.incrementer.style.bottom = `${top + SCORE_HEIGHT}px`
      if (c.total && c.lastTotal !== v.totals[i]) {
        c.total.textContent = String(v.totals[i])
        c.lastTotal = v.totals[i]
      }
    })
  }
  const applyRef = useRef(apply)
  applyRef.current = apply

  useLayoutEffect(() => {
    applyRef.current({
      old: rows.map((r) => r.oldScore),
      group: rows.map(() => 0),
      corr: rows.map(() => 0),
      overflow: rows.map(() => 0),
      totals: rows.map((r) => r.oldScore),
    })
  }, [rows])

  useEffect(() => {
    // Holding a finger or the mouse anywhere fast-forwards the animation.
    const held = new Set<number>()
    const down = (e: PointerEvent) => held.add(e.pointerId)
    const up = (e: PointerEvent) => held.delete(e.pointerId)
    const clear = () => held.clear()
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    window.addEventListener('blur', clear)

    const ctrl = new AbortController()
    runScoreboardAnimation(
      rows,
      { apply: (v) => applyRef.current(v), setLabel, setIncrementers, metricName: (i) => metrics[i] ?? '' },
      () => held.size > 0,
      ctrl.signal,
    ).then(() => {
      if (ctrl.signal.aborted) return
      // The leader is crowned every round; the victory treatment only once the game is over.
      const lead = leadingRow(rows)
      setLeader(lead)
      if (gameOver && lead >= 0) {
        setWinner(lead)
        setLabel(`${rows[lead].player.name} Wins!`)
      }
    })
    return () => {
      ctrl.abort()
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
      window.removeEventListener('blur', clear)
    }
  }, [rows, metrics, gameOver])

  // Leader crown bob (unscaled time; not affected by fast-forward).
  const bobTime = useRef(0)
  useFrame((dt) => {
    bobTime.current += dt
    const offset = Math.sin(bobTime.current * CROWN_BOB_SPEED) * CROWN_BOB_AMPLITUDE
    if (crownRef.current) crownRef.current.style.transform = `translateY(${-offset}px)`
  }, leader >= 0)

  const onRoundButton = () => {
    if (!gameOver) playTransition(`Round ${round + 1}`, startNextRound)
    else playTransition('Starting New Game!', newGame)
  }

  return (
    <Screen>
      <Rect pos={[0, 750]} size={[1108, 215]} scale={0.8}>
        <Img size={header.size} sprite={header.sprite} preserve />
      </Rect>
      <Text a={[0, 0.5, 1, 0.5]} pos={[0, 602]} size={[0, 119.73]} fontSize={75} color="#282828FF">
        {label}
      </Text>

      {/* Marker lines every 50 points, labelled every 100 (CanvasGroup alpha 0.5). */}
      <Rect a={[0, 0.5, 1, 0.5]} pos={[0, 78.68]} size={[0, 1100]} style={{ opacity: 0.5 }}>
        {Array.from({ length: 11 }, (_, k) => {
          const value = k * MARKER_STEP
          return (
            <Rect key={k} a={[0.5, 0, 0.5, 0]} pivot={[0.5, 0]} pos={[0, k * MARKER_PITCH]} size={[800, MARKER_LINE_HEIGHT]}>
              <Img sprite="Line 20_0" />
              {LABELLED_MARKERS.includes(value) && (
                <Text a={[1, 0.5, 1, 0.5]} pos={[-52.97, -20]} size={[105.93, 50]} fontSize={50} color="#414141FF" align="TopRight">
                  {value}
                </Text>
              )}
            </Rect>
          )
        })}
      </Rect>

      {/* Player columns (HorizontalLayoutGroup: left pad 100, spacing 25, bottom pad 4). */}
      <Rect a={[0, 0.5, 1, 0.5]} pos={[0, 78.68]} size={[0, 1100]}>
        {rows.map((row, i) => (
          <Rect
            key={row.player.id}
            a={[0, 0, 0, 0]}
            pivot={[0, 0]}
            pos={[COLUMN_X0 + i * COLUMN_PITCH, 4]}
            size={[90, 1100]}
            style={{ opacity: winner >= 0 && i !== winner ? LOSER_DIM_ALPHA : 1 }}
          >
            {showOld && <Bar barRef={(el) => void (cols.current[i].old = el)} sprite="Group Score Bar" color={OLD_COLORS[i]} />}
            <Bar barRef={(el) => void (cols.current[i].group = el)} sprite="Group Score Bar" color="#FFFFFFFF" />
            <Bar barRef={(el) => void (cols.current[i].corr = el)} sprite="Corruption Score Bar" color="#FFFFFFFF" />
            <div ref={(el) => void (cols.current[i].score = el)} style={{ position: 'absolute', left: 0, width: 90, height: SCORE_HEIGHT, bottom: 0 }}>
              <Text fontSize={50} color="#2F2F2FFF" align="Top">
                <span ref={(el) => void (cols.current[i].total = el)} />
              </Text>
              {leader === i && (
                <div ref={crownRef} style={{ position: 'absolute', inset: 0 }}>
                  <Rect a={[0, 1, 0, 1]} pos={CROWN_POS[i]} size={[512, 512]} scale={0.2} rot={15.336}>
                    <Img sprite="crown" color="#DBE90AFF" />
                  </Rect>
                </div>
              )}
            </div>
            {/* Score Incrementer: "+N" / "-N", visible only while this row animates. */}
            <div
              ref={(el) => void (cols.current[i].incrementer = el)}
              style={{ position: 'absolute', left: (90 - 167.01) / 2, width: 167.01, height: SCORE_HEIGHT, bottom: 0, visibility: incrementers[i] ? 'visible' : 'hidden' }}
            >
              <Text a={STRETCH} rot={349.163} fontSize={50} color="#2F2F2FFF" align="TopRight">
                {incrementers[i] ?? ''}
              </Text>
            </div>
          </Rect>
        ))}
      </Rect>

      {/* Rotated player names (not dimmed: they live outside the column CanvasGroups). */}
      <Rect a={[0, 0.5, 1, 0.5]} pos={[0, -560.66]} size={[0, 178.68]}>
        {rows.map((row, i) => (
          <Text
            key={row.player.id}
            a={[0, 1, 0, 1]}
            pos={[145 + i * COLUMN_PITCH, -90]}
            size={[150, 100]}
            rot={70}
            font="Liberation"
            bold
            fontSize={36}
            color="#282728FF"
            align="Right"
          >
            {row.player.name}
          </Text>
        ))}
      </Rect>

      <Button3D
        pos={[0, -750]}
        size={[750, 200]}
        label={gameOver ? 'New Game' : 'Next Round'}
        text={{ margin: [50.093, 0, 46.515, 0] }}
        onClick={onRoundButton}
      />
    </Screen>
  )
}
