// Teal backdrop with two slowly orbiting rings of faint parliament-seat diagrams
// (Unity "Background" with Rotate components; speeds in degrees/second).
import type { CSSProperties } from 'react'
import { Img } from '../ui/Img'
import { Rect, STRETCH, type V2 } from '../ui/Rect'

interface Seat {
  sprite: string
  pos: V2
  size: V2
  scale: number | V2
  rot?: number
  clockwise: boolean
  speed: number
}

const SEAT_COLOR = '#00000032'

const SMALL: Seat[] = [
  { sprite: 'Belgium Seats', pos: [2000, 0], size: [116, 81], scale: 2, clockwise: true, speed: 5 },
  { sprite: 'Icelandic Parliement Seats', pos: [1732, 1000], size: [101, 58], scale: 2, rot: 30, clockwise: true, speed: 5 },
  { sprite: 'Lithuania Seats', pos: [1000, 1732], size: [133, 80], scale: 2, clockwise: false, speed: 5 },
  { sprite: 'Slovenia Seats', pos: [0, 2000], size: [125, 125], scale: 2, clockwise: true, speed: 5 },
  { sprite: 'Luxembourg', pos: [-1000, 1732], size: [284, 540], scale: 0.6, clockwise: true, speed: 2 },
  { sprite: 'Cyprus Seats', pos: [-1732, 1000], size: [325, 428], scale: 0.8, clockwise: true, speed: 2 },
  { sprite: 'Latvia', pos: [-2000, 0], size: [282, 204], scale: 1.2, clockwise: true, speed: 2 },
  { sprite: 'Malta Seats', pos: [-1732, -1000], size: [831, 816], scale: 0.7, clockwise: true, speed: 2 },
  { sprite: 'Icelandic Parliement Seats', pos: [-1000, -1732], size: [101, 58], scale: 2, clockwise: true, speed: 2 },
  { sprite: 'Estonia Seats', pos: [0, -2000], size: [600, 328], scale: 0.6, clockwise: true, speed: 2 },
  { sprite: 'Ireland Seats', pos: [1000, -1732], size: [464, 492], scale: 0.6, clockwise: true, speed: 2 },
  { sprite: 'Netherlands Seats', pos: [1732, -1000], size: [512, 350], scale: 0.6, clockwise: true, speed: 2 },
]

const BIG: Seat[] = [
  { sprite: 'German Seats', pos: [-2000, 0], size: [449, 448], scale: 2, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'UK Seats', pos: [-1414, 1414], size: [165, 250], scale: 2, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'Hungary', pos: [1414, 1414], size: [637, 942], scale: 0.7, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'Sweden', pos: [1414, -1414], size: [1116, 614], scale: [0.6, 0.7], rot: 40, clockwise: true, speed: 5 },
  { sprite: 'EU', pos: [-1414, -1414], size: [972, 806], scale: 0.6, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'France', pos: [0, 2000], size: [976, 689], scale: 0.7, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'Greece', pos: [2000, 0], size: [873, 600], scale: 0.7, rot: 40, clockwise: true, speed: 5 },
  { sprite: 'Romania', pos: [0, -2000], size: [449, 448], scale: 1, rot: 40, clockwise: true, speed: 5 },
]

const spin = (clockwise: boolean, speed: number): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  animation: `spin ${360 / speed}s linear infinite${clockwise ? '' : ' reverse'}`,
})

function Ring({ pos, seats }: { pos: V2; seats: Seat[] }) {
  return (
    <Rect pos={pos} size={[100, 100]}>
      <div style={spin(true, 2)}>
        {seats.map((s, i) => (
          <Rect key={i} pos={s.pos} size={s.size} scale={s.scale} rot={s.rot}>
            <div style={spin(s.clockwise, s.speed)}>
              <Img sprite={s.sprite} color={SEAT_COLOR} />
            </div>
          </Rect>
        ))}
      </div>
    </Rect>
  )
}

export function Background({ color = '#48CFCBFF' }: { color?: string }) {
  return (
    <Rect pos={[-74.85, 89.78]} size={[10000, 8000]}>
      <Img a={STRETCH} color={color} />
      <Ring pos={[-1900, -1000]} seats={SMALL} />
      <Ring pos={[2000, 1000]} seats={BIG} />
    </Rect>
  )
}
