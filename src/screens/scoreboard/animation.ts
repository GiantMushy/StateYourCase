// Score data + the phased bar animation of Unity ScoreboardController, written as an async
// "coroutine" so it reads like the C# (yield return null => await frame()). Visual output is
// pushed through an `apply` callback so bars update imperatively, without React renders.
import * as M from '../../game/model'
import type { Player } from '../../game/types'
import { clamp01, easeInOutCubic, easeOutCubic } from '../../ui/anim'

// Inspector values (ScoreboardController on the Scoreboard panel).
export const MAX_SCORE = 500
/** barContainerHeight is 0 in the scene, so Unity auto-detects 0.9 × the 1100-unit column. */
export const BAR_CONTAINER_HEIGHT = 990
export const PIXELS_PER_POINT = BAR_CONTAINER_HEIGHT / MAX_SCORE
const INITIAL_HOLD_DELAY = 0.25
const PER_PHASE_DURATION = 0.7
const INTER_PHASE_DELAY = 0.35
const DEDUCT_DURATION = 0.8
const HOLD_FAST_FORWARD = 4

export interface Row {
  player: Player
  voteScore: number
  metric1Score: number
  metric2Score: number
  oldScore: number
  actualTotal: number
  penalty: number
  /** Points lost by being correctly accused: applied silently at the end. */
  accusedLoss: number
}

/** BuildRows: non-DM players in id order, at most seven slots. */
export function buildRows(g: M.GameData): Row[] {
  return M.nonDmPlayers(g)
    .slice(0, 7)
    .map((p) => {
      const grp = g.groups[p.groupId]
      const groupScore = grp?.score ?? 0
      const gross = p.oldScore + groupScore + p.roundCorruptionScore + p.stolenScore
      const actual = p.oldScore + groupScore + p.score
      return {
        player: p,
        voteScore: grp?.voteScore ?? 0,
        metric1Score: grp?.metric1Score ?? 0,
        metric2Score: grp?.metric2Score ?? 0,
        oldScore: p.oldScore,
        actualTotal: actual,
        penalty: p.penaltyScore,
        accusedLoss: Math.max(0, gross - actual - p.penaltyScore),
      }
    })
}

/** Animated per-row values (score points, not pixels). */
export interface AnimValues {
  old: number[]
  group: number[]
  corr: number[]
  /** Deduction no bar could absorb; drives the total counter below zero. */
  overflow: number[]
  totals: number[]
}

export interface AnimCallbacks {
  apply: (v: AnimValues) => void
  setLabel: (text: string) => void
  /** Per-row incrementer text, or null to hide it. */
  setIncrementers: (texts: (string | null)[]) => void
  metricName: (index: number) => string
}

/** Leader = first row with the highest actual total (GetLeadingRowIndex). */
export function leadingRow(rows: Row[]) {
  let best = -1
  let bestScore = -Infinity
  rows.forEach((r, i) => {
    if (r.actualTotal > bestScore) {
      bestScore = r.actualTotal
      best = i
    }
  })
  return best
}

/**
 * Runs RunScoreboardAnimation. `isHeld()` reports a finger/mouse held anywhere (×4 speed).
 * Resolves when finished; never resolves once `signal` is aborted (the coroutine just stops).
 */
export async function runScoreboardAnimation(rows: Row[], cb: AnimCallbacks, isHeld: () => boolean, signal: AbortSignal) {
  const n = rows.length
  let last = performance.now()
  const frame = () =>
    new Promise<number>((resolve) =>
      requestAnimationFrame((now) => {
        if (signal.aborted) return
        const dt = Math.min((now - last) / 1000, 1 / 3)
        last = now
        resolve(dt * (isHeld() ? HOLD_FAST_FORWARD : 1))
      }),
    )
  const wait = async (seconds: number) => {
    for (let t = 0; t < seconds; ) t += await frame()
  }

  // Init: old score pre-filled, everything else at 0, total = oldScore.
  const v: AnimValues = {
    old: rows.map((r) => r.oldScore),
    group: rows.map(() => 0),
    corr: rows.map(() => 0),
    overflow: rows.map(() => 0),
    totals: rows.map((r) => r.oldScore),
  }
  const recompute = (i: number) => (v.totals[i] = Math.round(v.old[i] + v.group[i] + v.corr[i] - v.overflow[i]))
  const hideIncrementers = () => cb.setIncrementers(rows.map(() => null))
  const showIncrementers = (amounts: number[], deduction: boolean) =>
    cb.setIncrementers(amounts.map((a) => (a > 0 ? `${deduction ? '-' : '+'}${a}` : null)))

  cb.setLabel('')
  hideIncrementers()
  cb.apply(v)
  await wait(INITIAL_HOLD_DELAY)

  const addToBar = async (bar: 'group' | 'corr', delta: number[]) => {
    const start = [...v[bar]]
    const set = (eased: number) => {
      for (let i = 0; i < n; i++) {
        v[bar][i] = start[i] + delta[i] * eased
        recompute(i)
      }
      cb.apply(v)
    }
    for (let t = 0; t < PER_PHASE_DURATION; ) {
      t += await frame()
      set(easeOutCubic(clamp01(t / PER_PHASE_DURATION)))
    }
    set(1)
  }

  // Drains Group, then Corruption, then Old; the remainder overflows into the counter.
  const deduct = async (amounts: number[]) => {
    const start = { group: [...v.group], corr: [...v.corr], old: [...v.old] }
    const cascade = (i: number, amount: number) => {
      let remaining = amount
      for (const bar of ['group', 'corr', 'old'] as const) {
        const after = Math.max(0, start[bar][i] - remaining)
        remaining -= start[bar][i] - after
        v[bar][i] = after
      }
      v.overflow[i] = remaining
      recompute(i)
    }
    const set = (eased: number) => {
      for (let i = 0; i < n; i++) if (amounts[i] > 0) cascade(i, amounts[i] * eased)
      cb.apply(v)
    }
    for (let t = 0; t < DEDUCT_DURATION; ) {
      t += await frame()
      set(easeInOutCubic(clamp01(t / DEDUCT_DURATION)))
    }
    set(1)
  }

  const phases: { label: string; bar: 'group' | 'corr'; delta: number[] }[] = [
    { label: 'Group Votes', bar: 'group', delta: rows.map((r) => r.voteScore) },
    { label: `Points for ${cb.metricName(0)}`, bar: 'group', delta: rows.map((r) => r.metric1Score) },
    { label: `Points for ${cb.metricName(1)}`, bar: 'group', delta: rows.map((r) => r.metric2Score) },
    { label: 'Corruptions', bar: 'corr', delta: rows.map((r) => r.player.roundCorruptionScore) },
    // Stolen points stack into the corruption bar.
    { label: 'Stolen Points', bar: 'corr', delta: rows.map((r) => r.player.stolenScore) },
  ]
  for (const phase of phases) {
    if (!phase.delta.some((d) => d !== 0)) continue
    cb.setLabel(phase.label)
    showIncrementers(phase.delta, false)
    await addToBar(phase.bar, phase.delta)
    await wait(INTER_PHASE_DELAY)
    hideIncrementers()
  }

  const penalties = rows.map((r) => r.penalty)
  if (penalties.some((p) => p !== 0)) {
    cb.setLabel('Penalties')
    showIncrementers(penalties, true)
    await deduct(penalties)
    hideIncrementers()
  }

  // accusedLoss is parked on the overflow so the total reaches actualTotal without a flash;
  // the corruption bar keeps showing the gross value.
  rows.forEach((r, i) => {
    if (r.accusedLoss > 0) {
      v.overflow[i] += r.accusedLoss
      recompute(i)
    }
  })
  cb.apply(v)
}
