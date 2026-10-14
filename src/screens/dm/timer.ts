export type TimerState = 'Stopped' | 'Running' | 'Paused' | 'AllGroupsDone'

/** UpdateTimerText: whole minutes and seconds, floored. */
export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
