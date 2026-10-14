// Versus / Scenario tab (Unity ToggleButton with animator "Button Versus" / "Button Scenario").
// ToggleButton latches the Selected state while toggled: only Normal is redirected to
// Selected, so hover (Highlighted) and Pressed still play over a toggled tab.
import type { CSSProperties } from 'react'
import { Img } from '../../ui/Img'
import { Rect, STRETCH, type RectProps, type V2 } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { useButton, type ButtonVisual, type StateDurations } from '../../ui/useButton'

interface TabVariant {
  durations: StateDurations
  bgSprite: string
  /** Border sprite in Normal/Highlighted, and in Pressed/Selected. */
  borderSprite: { up: string; down: string }
  icon: { sprite: string; size: V2; upY: number; downY: number }
  textX: number
}

export const TAB_VARIANTS = {
  Versus: {
    durations: { normal: 0.1, highlighted: 0.25, pressed: 0.1, selected: 0.1, disabled: 0.25 },
    bgSprite: 'Rectangle 111',
    borderSprite: { up: 'Rectangle 116', down: 'Rectangle 113' },
    icon: { sprite: 'swords_icon', size: [75, 75], upY: -70, downY: -81 },
    textX: -5,
  },
  Scenario: {
    durations: { normal: 0.25, highlighted: 0.25, pressed: 0.25, selected: 0.25, disabled: 0.25 },
    bgSprite: 'Rectangle 108',
    borderSprite: { up: 'Rectangle 109', down: 'Rectangle 110' },
    icon: { sprite: 'theater_icon', size: [100, 100], upY: -80, downY: -90 },
    textX: 0,
  },
} satisfies Record<string, TabVariant>

export interface TopicTabButtonProps extends RectProps {
  variant: TabVariant
  label: string
  toggled: boolean
  onClick: () => void
}

export function TopicTabButton({ variant, label, toggled, onClick, style, ...rect }: TopicTabButtonProps) {
  const { visual: raw, handlers } = useButton({ onClick })
  const visual: ButtonVisual = raw === 'normal' && toggled ? 'selected' : raw
  const down = visual === 'pressed' || visual === 'selected'
  const d = variant.durations[visual]
  const anim: CSSProperties = { transition: `all ${d}s linear` }

  return (
    <Rect
      {...rect}
      {...handlers}
      scale={visual === 'highlighted' ? 1.04 : 1}
      style={{ cursor: 'pointer', transition: `transform ${d}s linear`, ...style }}
    >
      <Img
        a={STRETCH}
        pos={down ? [0, -6] : [0, 0]}
        size={down ? [-10, -22] : [-10, -10]}
        sprite={variant.bgSprite}
        color="#424242FF"
        opacity={visual === 'selected' ? 0.9 : 1}
        sliced
        ppu={0.7}
        spritePpu={180}
        style={anim}
      />
      <Img
        a={STRETCH}
        pos={down ? [0, -6] : [0, 0]}
        size={down ? [0, -12] : [0, 0]}
        sprite={down ? variant.borderSprite.down : variant.borderSprite.up}
        color="#282828FF"
        sliced
        ppu={0.7}
        spritePpu={180}
        style={anim}
      />
      <Img
        a={[0.5, 1, 0.5, 1]}
        pos={[0, down ? variant.icon.downY : variant.icon.upY]}
        size={variant.icon.size}
        sprite={variant.icon.sprite}
        style={anim}
      />
      <Text a={[0, 0, 1, 0]} pos={[variant.textX, down ? 64 : 75]} size={[0, 70]} fontSize={90} color="#F5F5F5FF" style={anim}>
        {label}
      </Text>
    </Rect>
  )
}
