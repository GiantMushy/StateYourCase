// The turn order as a rack of small cassettes under the deck (redesign, not in Unity). The
// tape in the deck leaves an empty dashed slot (like the voting slots); tapes already played
// fade back, so the DM can see at a glance who is up next.
import type { Group } from '../../game/types'
import { Rect } from '../../ui/Rect'
import { Text } from '../../ui/Text'

const TAPE_W = 190
const TAPE_H = 122
const GAP = 22

export function TapeRack({ groups, current }: { groups: Group[]; current: number }) {
  return (
    <Rect flow size={[850, Math.ceil(groups.length / 4) * (TAPE_H + GAP) - GAP]}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', gap: GAP }}>
        {groups.map((g, i) => (
          <MiniTape key={g.id} name={g.name} state={i < current ? 'played' : i === current ? 'loaded' : 'queued'} />
        ))}
      </div>
    </Rect>
  )
}

function MiniTape({ name, state }: { name: string; state: 'played' | 'loaded' | 'queued' }) {
  const loaded = state === 'loaded'
  return (
    <Rect flow size={[TAPE_W, TAPE_H]} style={{ opacity: state === 'played' ? 0.4 : 1, transition: 'opacity 0.3s ease-out' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${TAPE_W} ${TAPE_H}`} style={{ position: 'absolute', inset: 0 }}>
        <rect
          x={3}
          y={3}
          width={TAPE_W - 6}
          height={TAPE_H - 6}
          rx={14}
          fill={loaded ? '#FFFFFF26' : '#D9D9D9'}
          stroke="#282828"
          strokeWidth={loaded ? 4 : 5}
          strokeDasharray={loaded ? '14 10' : undefined}
          style={{ transition: 'fill 0.3s' }}
        />
        {!loaded && (
          <>
            <rect x={14} y={12} width={TAPE_W - 28} height={56} rx={7} fill="#F5F5F5" stroke="#282828" strokeWidth={3} />
            <rect x={48} y={78} width={TAPE_W - 96} height={28} rx={14} fill="#B7B7B7" stroke="#282828" strokeWidth={3} />
            <circle cx={68} cy={92} r={8} fill="#424242" />
            <circle cx={TAPE_W - 68} cy={92} r={8} fill="#424242" />
          </>
        )}
      </svg>
      {!loaded && (
        <Text a={[0, 1, 1, 1]} pivot={[0.5, 1]} pos={[0, -12]} size={[-36, 56]} auto={[18, 36]} color="#282828FF" ls={-20}>
          {name}
        </Text>
      )}
    </Rect>
  )
}
