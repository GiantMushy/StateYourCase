// A metric pill (Unity "Comedy"/"Creativity"/… card with MetricDragHandler). Positioned
// absolutely at its grid home or at a vote slot; a short press is a click, a longer move
// becomes a drag (the parent owns all drag state and drop resolution).
import { useRef } from 'react'
import type { Metric } from '../../game/types'
import { useDragGesture, type DragPoint } from '../../ui/drag'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'

export const CARD_SIZE: V2 = [664, 220]
export const CARD_SCALE = 0.6

/** SetDisplacedVisual tint (0.82 grey) on the card's background image. */
const DISPLACED_TINT = '#D1D1D1FF'

export interface CaptionStyle {
  auto: readonly [number, number]
  margin: readonly [number, number, number, number]
}

/** The card's visuals, shared by the real card and its drag ghost. */
export function MetricCardFace({ label, caption, displaced }: { label: string; caption: CaptionStyle; displaced?: boolean }) {
  return (
    <>
      <Img sprite="Button Background Default" color={displaced ? DISPLACED_TINT : '#FFFFFFFF'} sliced ppu={1.4} spritePpu={100} />
      <Text fontSize={150} auto={caption.auto} color="#323232FF" margin={caption.margin}>
        {label}
      </Text>
      <Img a={STRETCH} size={[2, 2]} sprite="Button Border Pressed Default" color="#282828FF" sliced ppu={1.4} spritePpu={100} />
    </>
  )
}

export interface MetricCardProps {
  metric: Metric
  label: string
  caption: CaptionStyle
  pos: V2
  /** `data-drop` id while the card sits in a slot (MetricSlotDropProxy), else undefined. */
  dropId?: string
  dragging: boolean
  displaced: boolean
  onClick: (m: Metric) => void
  onDragStart: (m: Metric, p: DragPoint, el: Element) => void
  onDragMove: (p: DragPoint) => void
  onDragEnd: (p: DragPoint) => void
}

export function MetricCard({ metric, label, caption, pos, dropId, dragging, displaced, onClick, onDragStart, onDragMove, onDragEnd }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const gesture = useDragGesture({
    onClick: () => onClick(metric),
    onDragStart: (p) => onDragStart(metric, p, ref.current!),
    onDragMove,
    onDragEnd,
  })
  return (
    <Rect
      ref={ref}
      pos={pos}
      size={CARD_SIZE}
      scale={CARD_SCALE}
      // While dragged: CanvasGroup alpha 0.4 and blocksRaycasts off (so it is never its own drop target).
      data-drop={dragging ? undefined : dropId}
      {...gesture}
      style={{ ...gesture.style, opacity: dragging ? 0.4 : 1, cursor: 'pointer' }}
    >
      <MetricCardFace label={label} caption={caption} displaced={displaced} />
    </Rect>
  )
}
