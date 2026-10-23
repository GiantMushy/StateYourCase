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

let measure: CanvasRenderingContext2D | null = null

/**
 * Width of `el`'s widest unbreakable run (a word, or a whole line when wrapping is off) per px
 * of font size, from canvas text metrics: WebKit under CSS zoom misreports both scrollWidth and
 * text range sizes for text overflowing sideways. Small caps are approximated as capitals at 70%.
 */
function widestRun(el: HTMLElement, nowrap: boolean | undefined, spacingEm: number) {
  const s = getComputedStyle(el)
  measure ??= document.createElement('canvas').getContext('2d')!
  measure.font = `${s.fontStyle} ${s.fontWeight} 100px ${s.fontFamily}`
  const ctx = measure
  const text = s.textTransform === 'uppercase' ? (el.textContent ?? '').toUpperCase() : (el.textContent ?? '')
  const smallCaps = s.fontVariantCaps === 'small-caps' || s.fontVariant.includes('small-caps')
  const width = (run: string) =>
    smallCaps
      ? [...run].reduce((w, ch) => w + ctx.measureText(ch.toUpperCase()).width * (ch === ch.toUpperCase() ? 1 : 0.7), 0)
      : ctx.measureText(run).width
  let widest = 0
  for (const run of text.split(nowrap ? '\n' : /\s+/)) if (run) widest = Math.max(widest, width(run) / 100 + spacingEm * [...run].length)
  return widest
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
      const boxStyle = getComputedStyle(box)
      // Client/scroll sizes are whole CSS pixels rounded after the stage zoom, so in canvas units
      // each can be off by ~0.5/zoom (≈1.4 on a phone). Allow one rounded pixel either way, or a
      // label that fits easily can measure a unit or two wider than its box and never "fit".
      const stage = box.closest<HTMLElement>('.stage, .stage-layer')
      const tol = Math.max(0.5, 1 / ((stage && parseFloat(getComputedStyle(stage).zoom)) || 1))
      const availH = box.clientHeight - parseFloat(boxStyle.paddingTop) - parseFloat(boxStyle.paddingBottom) + tol
      // The text block is stretched to the box's content width. A size only fits if its widest
      // word (or line, unwrapped) fits that width too, so text shrinks before a word is split. Here
      // the rounding slack counts against the word: line breaking uses the exact width.
      const availW = el.clientWidth - tol
      const widest = widestRun(el, nowrap, cs / 100)
      const fits = (size: number) => {
        el.style.fontSize = `${size}px`
        return el.scrollHeight <= availH && widest * size <= availW
      }
      if (fits(autoMax)) return
      let lo = autoMin
      let hi = autoMax
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2
        if (fits(mid)) lo = mid
        else hi = mid
      }
      el.style.fontSize = `${lo}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [autoMin, autoMax, children, cs, smallCaps, upper, nowrap])

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
