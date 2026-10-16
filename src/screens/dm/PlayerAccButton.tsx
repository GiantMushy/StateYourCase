// Accusation list entry (Unity Button + animator "Button PlayerInAccList"). Besides the
// usual states, a second animator layer "Crossfire" (bool InCrossfire) recolours the button
// red with white text/icon while the player is a possible or chosen accusation target.
// Redesign additions: the button spins over (on its horizontal axis) whenever its colour or
// icon changes, swapping looks while edge-on; the gavel swings down when the player becomes
// the accuser (`strike`); and the pointing finger slides over and pokes the name when the
// accusation is confirmed (`poke`); a wrong accuser's name shakes as it fades out (`shake`).
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { useButton, type StateDurations, buttonTransition } from '../../ui/useButton'

/** Disabled fades in over half a second (Unity snapped), so a wrong accuser visibly fades out. */
const DURATIONS: StateDurations = { normal: 0.25, highlighted: 0.05, pressed: 0.05, selected: 0.05, disabled: 0.5 }
const CROSSFIRE_DURATION = 0.05

/** Spin: half-turn time each way, and the cascade delay between list entries. */
const SPIN_HALF_MS = 130
const SPIN_STAGGER_MS = 40
/** Total time of the finger poke (the panel waits this long before resolving). */
export const POKE_MS = 1000

const BUTTON_W = 700
/** Icon centre from the right edge, and the fingertip's distance from the icon centre. */
const ICON_X = 62
const FINGERTIP = 40

type Icon = 'gavel_icon' | 'point_shadow_0'

export interface PlayerAccButtonProps extends RectProps {
  name: string
  icon: Icon
  crossfire: boolean
  disabled: boolean
  /** Not clickable and half transparent, but otherwise drawn normally (a bystander). */
  dimmed?: boolean
  onClick: () => void
  /** Position in the list (staggers the spin). */
  index: number
  /** Bumped to swing the gavel. */
  strike: number
  /** Bumped to poke the name with the finger. */
  poke: number
  /** Bumped to shake the name (a wrong accusation). */
  shake: number
}

export function PlayerAccButton({ name, icon, crossfire, disabled, dimmed = false, onClick, index, strike, poke, shake, style, ...rect }: PlayerAccButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled: disabled || dimmed })
  const down = visual === 'pressed'
  const off = disabled
  const d = DURATIONS[visual]
  const anim: CSSProperties = { transition: `${buttonTransition('all', d, visual)}, color ${CROSSFIRE_DURATION}s linear` }

  const spinRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)

  // The look actually drawn; it catches up with the props halfway through a spin.
  const [shown, setShown] = useState({ icon, crossfire })
  useLayoutEffect(() => {
    if (shown.icon === icon && shown.crossfire === crossfire) return
    const el = spinRef.current
    if (!el) return setShown({ icon, crossfire })
    let live = true
    const away = el.animate([{ transform: 'perspective(900px) rotateX(0deg)' }, { transform: 'perspective(900px) rotateX(90deg)' }], {
      duration: SPIN_HALF_MS,
      delay: index * SPIN_STAGGER_MS,
      easing: 'ease-in',
      fill: 'forwards',
    })
    away.finished.then(
      () => {
        if (!live) return
        setShown({ icon, crossfire })
        el.animate([{ transform: 'perspective(900px) rotateX(-90deg)' }, { transform: 'perspective(900px) rotateX(0deg)' }], {
          duration: SPIN_HALF_MS * 1.6,
          easing: 'cubic-bezier(0.2, 1.5, 0.4, 1)',
        })
        away.cancel()
      },
      () => {},
    )
    return () => {
      live = false
      away.cancel()
    }
  }, [icon, crossfire, shown, index])

  // Gavel: wind up, slam down (the button takes the hit), settle.
  useLayoutEffect(() => {
    if (!strike) return
    iconRef.current?.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-38deg)', offset: 0.35, easing: 'ease-in' },
        { transform: 'rotate(18deg)', offset: 0.5, easing: 'ease-out' },
        { transform: 'rotate(10deg)', offset: 0.6 },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 520, easing: 'ease-out' },
    )
    spinRef.current?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(0)', offset: 0.48 }, { transform: 'translateY(7px) scale(0.985)', offset: 0.55 }, { transform: 'translateY(0)' }],
      520,
    )
  }, [strike])

  // Finger: slide over to the end of the name, poke it twice, slide back.
  useLayoutEffect(() => {
    if (!poke) return
    const box = spinRef.current?.getBoundingClientRect()
    const text = nameRef.current?.firstElementChild?.firstElementChild
    if (!box || !text || !box.width) return
    const range = document.createRange()
    range.selectNodeContents(text)
    const unit = BUTTON_W / box.width
    const nameEnd = (range.getBoundingClientRect().right - box.left) * unit
    const reach = Math.max(0, BUTTON_W - ICON_X - FINGERTIP - nameEnd - 6)
    iconRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-reach}px)`, offset: 0.35, easing: 'ease-out' },
        { transform: `translateX(${-reach + 28}px)`, offset: 0.47, easing: 'ease-in' },
        { transform: `translateX(${-reach}px)`, offset: 0.56, easing: 'ease-out' },
        { transform: `translateX(${-reach}px)`, offset: 0.68, easing: 'ease-in-out' },
        { transform: 'translateX(0)' },
      ],
      { duration: POKE_MS, easing: 'ease-in-out' },
    )
    const jolt = (at: number) => [
      { transform: 'translateX(0)', offset: at },
      { transform: 'translateX(-10px) rotate(-2deg)', offset: at + 0.03 },
      { transform: 'translateX(0)', offset: at + 0.09 },
    ]
    nameRef.current?.animate([{ transform: 'translateX(0)' }, ...jolt(0.33), ...jolt(0.54), { transform: 'translateX(0)' }], POKE_MS)
  }, [poke])

  // Name: a small "no" shake that dies down over the fade.
  useLayoutEffect(() => {
    if (!shake) return
    nameRef.current?.animate(
      [0, -9, 8, -7, 6, -4, 3, -1, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 500, easing: 'ease-out' },
    )
  }, [shake])

  // Disabled clip also re-lays the face: full width, nudged up.
  // Pressed: the face centre drops 6 units; name and icon ride with it exactly.
  const bgPos: V2 = down ? [0, -6] : off ? [0, 4.144] : [0, 0]
  const bgSize: V2 = down ? [-10, -24] : off ? [0, -8.289] : [-10, -10]
  const red = shown.crossfire
  const ink = red ? '#F5F5F5FF' : '#424242FF'

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.1 : 1}
      style={{
        cursor: disabled || dimmed ? 'default' : 'pointer',
        opacity: dimmed ? 0.5 : 1,
        transition: `${buttonTransition('transform', d, visual)}, opacity 0.2s ease-out`,
        willChange: 'transform',
        ...style,
      }}
    >
      <div ref={spinRef} style={{ position: 'absolute', inset: 0 }}>
        <Img
          a={STRETCH}
          pos={bgPos}
          size={bgSize}
          sprite="Button Background Square"
          color={red ? '#B21A33FF' : '#F5F5F5FF'}
          opacity={off ? 0.227 : 1}
          sliced
          ppu={1.2}
          spritePpu={140}
          style={anim}
        />
        <Img
          a={STRETCH}
          pos={down ? [0, -5.5] : [0, 0]}
          size={down ? [0, -12] : [0, 0]}
          sprite={down ? 'Button Border Pressed Square' : 'Button Border Square'}
          color={red ? '#661A33FF' : '#424242FF'}
          opacity={off ? 0.502 : 1}
          sliced
          ppu={1.2}
          spritePpu={140}
          style={anim}
        />
        <div ref={nameRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <Text
            a={[0, 0.5, 0, 0.5]}
            pos={[288.88, down ? 5.59 - 6 : 5.59]}
            size={[577.77, 73.96]}
            fontSize={60}
            color={ink}
            align="Left"
            margin={[30, 0, 0, 0]}
            nowrap
            textStyle={{ overflow: 'hidden', textOverflow: 'ellipsis', transition: `color ${CROSSFIRE_DURATION}s linear` }}
            style={anim}
          >
            {name}
          </Text>
        </div>
        <Rect ref={iconRef} a={[1, 0.5, 1, 0.5]} pos={[-ICON_X, down ? -6 : 0]} size={[80, 80]} style={{ ...anim, transformOrigin: '22% 78%' }}>
          <Img sprite={shown.icon} color={ink} style={anim} />
        </Rect>
      </div>
    </Rect>
  )
}
