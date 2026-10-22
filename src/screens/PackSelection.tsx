// Pack picker: a horizontal swipe carousel (Unity PackSelectionController). `display` is a
// float index driven directly while dragging and by a damped spring after release; the
// screen background lerps between neighbouring pack colours.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useGame } from '../game/store'
import type { Pack } from '../game/types'
import { useT, type StringKey } from '../i18n'
import { useFrame } from '../ui/anim'
import { BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH, type V2 } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { useStage } from '../ui/Stage'
import { Text } from '../ui/Text'

interface PackCard {
  pack: Pack
  color: string
  icon: string
  iconPos: V2
  iconSize: V2
  title: StringKey
  description: StringKey
}

const CARDS: PackCard[] = [
  { pack: 'Default', color: '#48CFCBFF', icon: 'classic', iconPos: [425, 727.04], iconSize: [840, 535.89], title: 'Pack_Basic', description: 'Pack_Description_Classic' },
  { pack: 'Icelandic', color: '#4860CFFF', icon: 'iceland', iconPos: [425, 727.04], iconSize: [840, 535.89], title: 'Pack_Icelandic', description: 'Pack_Description_Iceland' },
  { pack: 'PopCulture', color: '#48CF6BFF', icon: 'pop', iconPos: [425, 727.04], iconSize: [840, 535.89], title: 'Pack_PopCulture', description: 'Pack_Description_PopCulture' },
  { pack: 'Political', color: '#CF5348FF', icon: 'politics', iconPos: [425, 727.04], iconSize: [840, 535.89], title: 'Pack_Political', description: 'Pack_Description_Political' },
  { pack: 'EighteenPlus', color: '#CF48ADFF', icon: 'emoji18', iconPos: [425, 708.98], iconSize: [840, 499.76], title: 'Pack_18', description: 'Pack_Description_EighteenPlus' },
]
// Card body colours as authored on each card's Background image (slightly differ from the screen tint).
const BODY_COLORS: Record<Pack, string> = {
  Default: '#48CFCBFF',
  Icelandic: '#484FCFFF',
  PopCulture: '#48CF4BFF',
  Political: '#CF4F48FF',
  EighteenPlus: '#CF48C9FF',
}

// Slot layout and swipe/spring tuning (Inspector values).
const SLOT = {
  current: { pos: [0, 0] as V2, scale: 1 },
  next: { pos: [180, -60] as V2, scale: 0.78 },
  prev: { pos: [-180, -60] as V2, scale: 0.78 },
  offRight: { pos: [1400, -120] as V2 },
  offLeft: { pos: [-1400, -120] as V2 },
  offScale: 0.5,
}
const SWIPE_THRESHOLD = 120
const RUBBERBAND = 0.3
const FLICK_VELOCITY = 600
const STIFFNESS = 120
const DAMPING_RATIO = 0.6
const MAX_SEED_VELOCITY = 12
const COLOR_POWER = 2

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

// Wide windows (iPad): the neighbours move out into the side bands, up to fully beside the front
// card, keeping this margin from the window edge. Phones keep the Unity slots.
const CARD_W = 850
const WIDE_EDGE_MARGIN = 60
const WIDE_GAP = 40
const WIDE_MAX_X = CARD_W / 2 + (CARD_W * SLOT.next.scale) / 2 + WIDE_GAP

/** Horizontal slot distances from the centre: neighbours (`nearX`) and the faded-out slots beyond (`farX`). */
interface SlotX {
  nearX: number
  farX: number
}
const UNITY_SLOT_X: SlotX = { nearX: SLOT.next.pos[0], farX: SLOT.offRight.pos[0] }

function slotPose(offset: number, { nearX, farX }: SlotX = UNITY_SLOT_X) {
  const abs = Math.abs(offset)
  const side = offset >= 0 ? 1 : -1
  const nearSlot = offset >= 0 ? SLOT.next : SLOT.prev
  const farSlot = offset >= 0 ? SLOT.offRight : SLOT.offLeft
  const near = { pos: [side * nearX, nearSlot.pos[1]] as V2, scale: nearSlot.scale }
  const far = { pos: [side * farX, farSlot.pos[1]] as V2 }
  if (abs <= 1) return { pos: lerp2(SLOT.current.pos, near.pos, abs), scale: lerp(SLOT.current.scale, near.scale, abs), alpha: 1 }
  const t = Math.min(1, abs - 1)
  return { pos: lerp2(near.pos, far.pos, t), scale: lerp(near.scale, SLOT.offScale, t), alpha: 1 - t }
}

function mixColor(a: string, b: string, t: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map((i) => Math.round(lerp(ch(a, i), ch(b, i), t)).toString(16).padStart(2, '0')).join('') + 'FF'
}

export function PackSelection() {
  const t = useT()
  const ownedPacks = useGame((s) => s.ownedPacks)
  const gameMode = useGame((s) => s.gameMode)
  const setScreen = useGame((s) => s.setScreen)
  const setBgColor = useGame((s) => s.setBgColor)
  const selectPack = useGame((s) => s.selectPack)
  const continueAfterPackSelection = useGame((s) => s.continueAfterPackSelection)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [display, setDisplay] = useState(0)
  const sim = useRef({ index: 0, display: 0, velocity: 0, dragging: false, dragDx: 0, dragVel: 0, lastX: 0, lastT: 0, pointer: -1 })

  // Screen tint follows the carousel, biased toward the current card (power curve).
  useEffect(() => {
    const diff = display - currentIndex
    const neighbor = diff > 0 ? Math.min(currentIndex + 1, CARDS.length - 1) : diff < 0 ? Math.max(currentIndex - 1, 0) : currentIndex
    const ct = Math.pow(Math.min(1, Math.abs(diff)), COLOR_POWER)
    setBgColor(mixColor(CARDS[currentIndex].color, CARDS[neighbor].color, ct))
  }, [display, currentIndex, setBgColor])

  useFrame((frameDt) => {
    const s = sim.current
    if (s.dragging) return
    const displacement = s.display - s.index
    if (Math.abs(displacement) < 0.0005 && Math.abs(s.velocity) < 0.01) {
      if (s.display !== s.index || s.velocity !== 0) {
        s.display = s.index
        s.velocity = 0
        setDisplay(s.display)
      }
      return
    }
    const dt = Math.min(frameDt, 1 / 30)
    const omega = Math.sqrt(STIFFNESS)
    const damping = 2 * DAMPING_RATIO * omega
    s.velocity += (-STIFFNESS * displacement - damping * s.velocity) * dt
    s.display += s.velocity * dt
    setDisplay(s.display)
  })

  // Drag distances are measured in device pixels, like Unity's PointerEventData.delta.
  const dpr = window.devicePixelRatio || 1
  const progressFor = (dx: number) => {
    const raw = dx / SWIPE_THRESHOLD
    const s = sim.current
    if (s.index === 0 && raw > 0) return Math.min(raw * RUBBERBAND, RUBBERBAND)
    if (s.index === CARDS.length - 1 && raw < 0) return Math.max(raw * RUBBERBAND, -RUBBERBAND)
    return Math.max(-1, Math.min(1, raw))
  }

  const onPointerDown = (e: PointerEvent) => {
    const s = sim.current
    s.pointer = e.pointerId
    s.lastX = e.clientX
    s.lastT = performance.now()
    s.dragDx = 0
  }
  const onPointerMove = (e: PointerEvent) => {
    const s = sim.current
    if (s.pointer !== e.pointerId) return
    const dx = (e.clientX - s.lastX) * dpr
    const now = performance.now()
    const dt = Math.max(0.001, (now - s.lastT) / 1000)
    s.lastX = e.clientX
    s.lastT = now
    if (!s.dragging) {
      s.dragDx += dx
      if (Math.abs(s.dragDx) < 10) return
      s.dragging = true
      s.velocity = 0
      s.dragVel = 0
      return
    }
    s.dragDx += dx
    s.dragVel = lerp(s.dragVel, dx / dt, 0.4)
    s.display = s.index - progressFor(s.dragDx)
    setDisplay(s.display)
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = sim.current
    if (s.pointer !== e.pointerId) return
    s.pointer = -1
    if (!s.dragging) return
    s.dragging = false
    let target = s.index
    if ((s.dragDx <= -SWIPE_THRESHOLD || s.dragVel <= -FLICK_VELOCITY) && s.index < CARDS.length - 1) target++
    else if ((s.dragDx >= SWIPE_THRESHOLD || s.dragVel >= FLICK_VELOCITY) && s.index > 0) target--
    s.index = target
    setCurrentIndex(target)
    s.velocity = Math.max(-MAX_SEED_VELOCITY, Math.min(MAX_SEED_VELOCITY, -s.dragVel / SWIPE_THRESHOLD))
    s.dragDx = 0
    s.dragVel = 0
  }

  const select = (i: number) => {
    if (i !== sim.current.index || sim.current.dragging) return
    selectPack(CARDS[i].pack)
    continueAfterPackSelection()
  }

  // Wide windows: spread the neighbours into the side bands, and pull the faded-out slots in so
  // cards fade in/out inside the window instead of sliding past its edge. Eased in with the
  // bands; phones keep the Unity slots.
  const { width, viewWidth } = useStage()
  const wide = Math.min(1, Math.max(0, (viewWidth - width) / 200))
  const room = viewWidth / 2 - WIDE_EDGE_MARGIN
  const wideNear = Math.max(UNITY_SLOT_X.nearX, Math.min(WIDE_MAX_X, room - (CARD_W * SLOT.next.scale) / 2))
  const wideFar = Math.max(wideNear, room - (CARD_W * SLOT.offScale) / 2)
  const slotX: SlotX = {
    nearX: lerp(UNITY_SLOT_X.nearX, wideNear, wide),
    farX: lerp(UNITY_SLOT_X.farX, wideFar, wide),
  }
  // The swipe area also covers the side bands.
  const band = (viewWidth - width) / 2

  // Draw order: farthest from the current card first. Cards two or more slots away are invisible,
  // so the screen opens with just the front card and its neighbours (each card is several large
  // canvases, slow to bring up on phones) and adds the rest once it has painted.
  const [allCards, setAllCards] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setAllCards(true), 300)
    return () => clearTimeout(id)
  }, [])
  const order = CARDS.map((_, i) => i)
    .filter((i) => allCards || Math.abs(i - currentIndex) <= 1 || Math.abs(i - display) < 2)
    .sort((a, b) => Math.abs(b - currentIndex) - Math.abs(a - currentIndex))

  return (
    <Screen>
      <div
        style={{ position: 'absolute', top: 0, bottom: 0, left: -band, right: -band, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <BackButton onClick={() => setScreen(gameMode === 'OnlineHost' ? 'HostVsJoin' : 'LocalVsOnline')} />
        <Img pos={[0, 550]} size={[775, 600]} sprite="State your Case" />
        <Rect a={STRETCH} pos={[0, -403.39]} size={[0, -1006.62]}>
          {order.map((i) => {
            const card = CARDS[i]
            const pose = slotPose(i - display, slotX)
            const owned = ownedPacks.includes(card.pack)
            return (
              <Rect
                key={card.pack}
                pos={pose.pos}
                size={[850, 1000]}
                scale={pose.scale}
                style={{ opacity: pose.alpha, pointerEvents: pose.alpha > 0.2 ? 'auto' : 'none' }}
              >
                <Img a={STRETCH} pos={[0, -1.17]} size={[-10, -7.68]} sprite="Button Background Sharp" color={BODY_COLORS[card.pack]} sliced spritePpu={140} />
                <Img a={STRETCH} pos={[0, -1.17]} size={[0, 2.35]} sprite="Button Border Sharp" color="#282828FF" sliced spritePpu={140} />
                <Img a={[0, 0, 0, 0]} pos={card.iconPos} size={card.iconSize} sprite={card.icon} preserve />
                <Text a={[0, 0.5, 1, 0.5]} pos={[0, -131.16]} size={[0, 224]} fontSize={90} auto={[50, 90]} color="#F5F5F5FF" align="Left" margin={[58.592, 0, 65.353, 0]}>
                  {t(card.description)}
                </Text>
                <Button3D
                  a={[0, 0, 1, 0]}
                  pos={[0, 136]}
                  size={[-40, 202.04]}
                  edgeColor="#282828FF"
                  ppu={1.4}
                  label={t(card.title)}
                  text={{ fontSize: 150, auto: [60, 150], align: 'Left', margin: [45.071, 0, 141.973, 0] }}
                  disabled={!owned || i !== currentIndex}
                  onClick={() => select(i)}
                  overlay={!owned && <Img pos={[330, 9.25]} size={[100, 100]} sprite="Lock" />}
                />
              </Rect>
            )
          })}
        </Rect>
      </div>
    </Screen>
  )
}
