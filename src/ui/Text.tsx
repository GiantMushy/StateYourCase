// TextMeshPro equivalent: font size in canvas units, TMP alignment names, margins,
// character spacing (em/100) and auto-sizing (largest size in [min, max] that fits).
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { linearAlpha } from './linearBlend'
import { rectStyle, type RectProps } from './Rect'
import { parseColor } from './sprites'

export type TmpAlign =
  | 'TopLeft' | 'Top' | 'TopRight' | 'TopJustified'
  | 'Left' | 'Center' | 'Right' | 'Justified'
  | 'BottomLeft' | 'Bottom' | 'BottomRight'
  | 'MidlineLeft' | 'Midline' | 'MidlineRight'
  | 'BaselineLeft' | 'Baseline' | 'BaselineRight'
  | 'CaplineLeft' | 'Capline' | 'CaplineRight'

export interface TextProps extends Omit<RectProps, 'color'> {
  children: ReactNode
  /** TMP font size in canvas units. */
  fontSize?: number
  /** [min, max] enables TMP auto-size; `fontSize` is then ignored. */
  auto?: readonly [number, number]
  color?: string
  align?: TmpAlign
  /** TMP margin: left, top, right, bottom. */
  margin?: readonly [number, number, number, number]
  /** TMP characterSpacing (em/100). */
  cs?: number
  /** TMP lineSpacing (em/100) added to the default line height. */
  ls?: number
  bold?: boolean
  italic?: boolean
  smallCaps?: boolean
  upper?: boolean
  nowrap?: boolean
  font?: 'Iceland' | 'Liberation'
  textStyle?: CSSProperties
}

/** TMP faceInfo.lineHeight / pointSize for each font asset (Iceland 54.32/56, Liberation 98.89/86). */
const LINE_HEIGHT = { Iceland: 54.32 / 56, Liberation: 98.89 / 86 }

function alignStyle(align: TmpAlign): CSSProperties {
  const v = align.startsWith('Top') ? 'flex-start' : align.startsWith('Bottom') || align.startsWith('Baseline') ? 'flex-end' : 'center'
  const h = /Left$/.test(align) ? 'left' : /Right$/.test(align) ? 'right' : /Justified$/.test(align) ? 'justify' : 'center'
  return { justifyContent: v, textAlign: h }
}

const toCss = (hex: string) => {
  const c = parseColor(hex)
  // Linear-space blending like Unity (see linearBlend.ts).
  return `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${linearAlpha(c, c.a)})`
}

export function Text({
  children, fontSize = 36, auto, color = '#323232FF', align = 'Center', margin = [0, 0, 0, 0], cs = 0, ls = 0,
  bold, italic, smallCaps, upper, nowrap, font = 'Iceland', textStyle,
  a, pivot, pos, size, scale, rot, flow, style, className, ...rest
}: TextProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const hasRect = a || pos || size || flow

  const autoMin = auto?.[0]
  const autoMax = auto?.[1]
  useLayoutEffect(() => {
    if (autoMin === undefined || autoMax === undefined) return
    const box = boxRef.current
    const el = textRef.current
    if (!box || !el) return
    const fit = () => {
      const cs = getComputedStyle(box)
      const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) + 0.5
      const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 0.5
      const fits = () => el.scrollHeight <= availH && el.scrollWidth <= availW
      let lo = autoMin
      let hi = autoMax
      el.style.fontSize = `${hi}px`
      if (fits()) return
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2
        el.style.fontSize = `${mid}px`
        if (fits()) lo = mid
        else hi = mid
      }
      el.style.fontSize = `${lo}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [autoMin, autoMax, children, cs, smallCaps, upper])

  const base: CSSProperties = hasRect ? rectStyle({ a, pivot, pos, size, scale, rot, flow }) : { position: 'absolute', inset: 0 }
  return (
    <div
      ref={boxRef}
      className={className}
      {...rest}
      style={{
        ...base,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: `${margin[1]}px ${margin[2]}px ${margin[3]}px ${margin[0]}px`,
        pointerEvents: 'none',
        ...alignStyle(align),
        ...style,
      }}
    >
      <div
        ref={textRef}
        style={{
          fontFamily: font === 'Iceland' ? 'Iceland, sans-serif' : 'LiberationSans, Arial, sans-serif',
          fontSize: auto ? auto[1] : fontSize,
          lineHeight: LINE_HEIGHT[font] + ls / 100,
          letterSpacing: cs ? `${cs / 100}em` : undefined,
          color: toCss(color),
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
          fontVariant: smallCaps ? 'small-caps' : undefined,
          textTransform: upper ? 'uppercase' : undefined,
          whiteSpace: nowrap ? 'pre' : 'pre-wrap',
          overflowWrap: 'break-word',
          ...textStyle,
        }}
      >
        {children}
      </div>
    </div>
  )
}
