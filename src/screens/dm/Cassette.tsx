// The presenting group as a cassette tape (redesign, not in Unity), drawn like the rack's mini
// tapes: a plain shell, a paper label with the group name, its For/Against side and one ruled
// line per player, and a reel window below. The reels spin while the timer runs.
import { useRef } from 'react'
import type { Group, Player } from '../../game/types'
import { useT } from '../../i18n'
import { useFrame } from '../../ui/anim'
import { Rect, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'

export const CASSETTE_W = 760
export const CASSETTE_H = 500

const INK = '#282828'
const DARK = '#424242'

/** Label (paper) box, its title row and the ruled names area. */
const LABEL = { x: 50, y: 36, w: CASSETTE_W - 100, h: 262 }
const TITLE_H = 70
const NAMES = { x: LABEL.x + 30, y: LABEL.y + TITLE_H + 6, w: LABEL.w - 60, h: LABEL.h - TITLE_H - 14 }
/** Reel window (a stadium) and the reel centres inside it. */
const WIN = { x: 150, y: 314, w: CASSETTE_W - 300, h: 150 }
const REEL_Y = WIN.y + WIN.h / 2
const REEL_X = [WIN.x + 112, WIN.x + WIN.w - 112] as const
const HUB_R = 32
const PACK_R = 58
/** Reel speed in degrees per second. */
const SPIN_SPEED = 200

/** Top-left box in the cassette's own coordinates (y down) as Rect props. */
const box = (x: number, y: number, w: number, h: number): RectProps => ({ a: [0, 1, 0, 1], pivot: [0, 1], pos: [x, -y], size: [w, h] })

export interface CassetteProps extends RectProps {
  group: Group
  players: Player[]
  spinning: boolean
}

export function Cassette({ group, players, spinning, ...rect }: CassetteProps) {
  const t = useT()

  // The reel angle lives outside React: the reels turn every frame.
  const reelRefs = [useRef<SVGGElement>(null), useRef<SVGGElement>(null)]
  const angle = useRef(0)
  useFrame((dt) => {
    angle.current = (angle.current + SPIN_SPEED * dt) % 360
    reelRefs.forEach((r, i) => r.current?.setAttribute('transform', `rotate(${angle.current} ${REEL_X[i]} ${REEL_Y})`))
  }, spinning)

  // Names on ruled lines: one column for up to three players, then two.
  const cols = players.length > 3 ? 2 : 1
  const rows = Math.max(1, Math.ceil(players.length / cols))
  const rowH = NAMES.h / Math.max(rows, 2)
  const namesTop = NAMES.y + (NAMES.h - rowH * rows) / 2
  const colW = NAMES.w / cols

  return (
    <Rect {...rect}>
      <svg width="100%" height="100%" viewBox={`0 0 ${CASSETTE_W} ${CASSETTE_H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <rect x={6} y={6} width={CASSETTE_W - 12} height={CASSETTE_H - 12} rx={50} fill="#D9D9D9" stroke={INK} strokeWidth={12} />

        {/* Label: paper with a title row and ruled lines. */}
        <rect x={LABEL.x} y={LABEL.y} width={LABEL.w} height={LABEL.h} rx={26} fill="#F5F5F5" stroke={INK} strokeWidth={8} />
        <line x1={LABEL.x + 24} y1={LABEL.y + TITLE_H} x2={LABEL.x + LABEL.w - 24} y2={LABEL.y + TITLE_H} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <line
              key={`${r}-${c}`}
              x1={NAMES.x + c * colW + (c ? 18 : 0)}
              x2={NAMES.x + (c + 1) * colW - (c + 1 < cols ? 18 : 0)}
              y1={namesTop + (r + 1) * rowH - 6}
              y2={namesTop + (r + 1) * rowH - 6}
              stroke="#B7B7B7"
              strokeWidth={4}
              strokeLinecap="round"
            />
          )),
        )}

        {/* Reel window: two equal tape packs and the turning hubs. */}
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={WIN.h / 2} fill="#B7B7B7" stroke={INK} strokeWidth={8} />
        {REEL_X.map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={REEL_Y} r={PACK_R} fill={DARK} />
            <g ref={reelRefs[i]}>
              <circle cx={x} cy={REEL_Y} r={HUB_R} fill="#F5F5F5" stroke={INK} strokeWidth={6} />
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <rect key={deg} x={x - 5} y={REEL_Y - HUB_R + 4} width={10} height={14} rx={3} fill={INK} transform={`rotate(${deg} ${x} ${REEL_Y})`} />
              ))}
              <circle cx={x} cy={REEL_Y} r={9} fill={INK} />
            </g>
          </g>
        ))}
      </svg>

      <Text {...box(LABEL.x + 30, LABEL.y + 4, LABEL.w * 0.58, TITLE_H - 4)} auto={[40, 62]} color="#282828FF" align="MidlineLeft" nowrap>
        {group.name}
      </Text>
      <Text {...box(LABEL.x + LABEL.w * 0.55, LABEL.y + 4, LABEL.w * 0.45 - 30, TITLE_H - 4)} auto={[40, 62]} color="#282828FF" align="MidlineRight" nowrap>
        {t(group.position)}
      </Text>
      {players.map((p, i) => {
        const c = cols === 1 ? 0 : i % cols
        const r = cols === 1 ? i : Math.floor(i / cols)
        return (
          <Text
            key={p.id}
            {...box(NAMES.x + c * colW + (c ? 18 : 0), namesTop + r * rowH, colW - (cols > 1 ? 18 : 0), rowH - 6)}
            auto={[30, cols === 1 ? 60 : 52]}
            color="#424242FF"
            align={cols === 1 ? 'Bottom' : 'BottomLeft'}
            margin={[cols === 1 ? 0 : 8, 0, 0, 4]}
            nowrap
          >
            {p.name}
          </Text>
        )
      })}
    </Rect>
  )
}
