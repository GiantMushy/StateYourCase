// Unity Button with the ColorTint transition: the target Image's colour is multiplied by
// normal/highlighted/pressed/disabled tints, fading over 0.1s. Since tints are greys, a
// CSS brightness filter reproduces the multiply exactly and can animate.
import type { CSSProperties, ReactNode } from 'react'
import { Img, type ImgProps } from './Img'
import { Rect, type RectProps } from './Rect'
import { useButton } from './useButton'

export interface TintButtonProps extends RectProps {
  /** The target graphic (Image on the button object). Omit for an invisible hit area. */
  image?: Omit<ImgProps, 'a' | 'pivot' | 'pos' | 'size' | 'scale' | 'rot' | 'flow'>
  onClick?: () => void
  disabled?: boolean
  children?: ReactNode
  /** Default Unity ColorBlock: F5 highlighted, C8 pressed, C8@50% disabled. */
  tints?: { highlighted: number; pressed: number; disabled: number; disabledAlpha: number }
}

const DEFAULT_TINTS = { highlighted: 0xf5 / 255, pressed: 0xc8 / 255, disabled: 0xc8 / 255, disabledAlpha: 0.5 }

export function TintButton({ image, onClick, disabled, children, tints = DEFAULT_TINTS, style, ...rect }: TintButtonProps) {
  const { visual, handlers } = useButton({ onClick, disabled })
  const brightness =
    visual === 'pressed' || visual === 'selected'
      ? tints.pressed
      : visual === 'highlighted'
        ? tints.highlighted
        : visual === 'disabled'
          ? tints.disabled
          : 1
  const imgStyle: CSSProperties = {
    filter: brightness < 1 ? `brightness(${brightness})` : undefined,
    transition: 'filter 0.1s linear, opacity 0.1s linear',
  }
  return (
    <Rect {...rect} {...handlers} style={{ cursor: disabled ? 'default' : 'pointer', ...style }}>
      {image && <Img {...image} opacity={(image.opacity ?? 1) * (visual === 'disabled' ? tints.disabledAlpha : 1)} style={imgStyle} />}
      {children}
    </Rect>
  )
}
