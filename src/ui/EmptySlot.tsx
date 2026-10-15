// Dashed "drop here" placeholder (Unity EmptyField). Unity only tinted it #CCF2FF on hover,
// which is barely visible on the translucent sprite; here a hovered slot brightens (a second,
// stacked copy of the sprite) and pops up slightly.
import { Img } from './Img'

export function EmptySlot({ hovered }: { hovered: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${hovered ? 1.06 : 1})`, transition: 'transform 0.15s ease-out' }}>
      <Img sprite="EmptyField" />
      <Img sprite="EmptyField" opacity={hovered ? 1 : 0} style={{ transition: 'opacity 0.15s ease-out' }} />
    </div>
  )
}
