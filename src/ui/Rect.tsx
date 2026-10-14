// RectTransform equivalent. Positions a child inside its (position: relative/absolute)
// parent using Unity anchors, pivot, anchoredPosition and sizeDelta — values can be copied
// straight from the Unity Inspector. Unity's y axis points up; this converts to CSS.
import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'

export type V2 = readonly [number, number]

export interface RectProps extends HTMLAttributes<HTMLDivElement> {
  /** anchorMin.x, anchorMin.y, anchorMax.x, anchorMax.y (default: centre point). */
  a?: readonly [number, number, number, number]
  pivot?: V2
  pos?: V2
  size?: V2
  scale?: number | V2
  rot?: number
  /** Child of a Unity layout group: size from `size`, positioned by the parent's flexbox. */
  flow?: boolean
}

export function rectStyle({ a = [0.5, 0.5, 0.5, 0.5], pivot = [0.5, 0.5], pos = [0, 0], size = [0, 0], scale, rot, flow }: RectProps): CSSProperties {
  if (flow) return { position: 'relative', width: size[0], height: size[1], flex: 'none', ...transformStyle(pivot, scale, rot) }
  const [minX, minY, maxX, maxY] = a
  const offMinX = pos[0] - size[0] * pivot[0]
  const offMaxX = pos[0] + size[0] * (1 - pivot[0])
  const offMinY = pos[1] - size[1] * pivot[1]
  const offMaxY = pos[1] + size[1] * (1 - pivot[1])
  const style: CSSProperties = {
    position: 'absolute',
    left: `calc(${minX * 100}% + ${offMinX}px)`,
    width: `calc(${(maxX - minX) * 100}% + ${offMaxX - offMinX}px)`,
    bottom: `calc(${minY * 100}% + ${offMinY}px)`,
    height: `calc(${(maxY - minY) * 100}% + ${offMaxY - offMinY}px)`,
  }
  return { ...style, ...transformStyle(pivot, scale, rot) }
}

function transformStyle(pivot: V2, scale?: number | V2, rot?: number): CSSProperties {
  const style: CSSProperties = {}
  // Unity composes T·R·S, i.e. scale first, then rotation (CSS applies right-to-left).
  const transforms: string[] = []
  if (rot) transforms.push(`rotate(${-rot}deg)`)
  if (scale !== undefined) {
    const [sx, sy] = typeof scale === 'number' ? [scale, scale] : scale
    if (sx !== 1 || sy !== 1) transforms.push(`scale(${sx}, ${sy})`)
  }
  if (transforms.length) {
    style.transform = transforms.join(' ')
    style.transformOrigin = `${pivot[0] * 100}% ${(1 - pivot[1]) * 100}%`
  }
  return style
}

/** Full-stretch anchors with zero offsets. */
export const STRETCH = [0, 0, 1, 1] as const

export const Rect = forwardRef<HTMLDivElement, RectProps>(function Rect(
  { a, pivot, pos, size, scale, rot, flow, style, ...rest },
  ref,
) {
  return <div ref={ref} {...rest} style={{ ...rectStyle({ a, pivot, pos, size, scale, rot, flow }), ...style }} />
})
