// Correct / Incorrect accusation buttons: the shared Button3D with these instances' slicing
// (face and outline at ppu 1.4, 3D base at ppu 1) and a fixed 72-unit label.
import { Button3D } from '../../ui/Button3D'
import type { RectProps } from '../../ui/Rect'

export interface AcceptButtonProps extends RectProps {
  label: string
  faceColor: string
  /** TMP margins differ per instance. */
  margin: readonly [number, number, number, number]
  disabled: boolean
  onClick: () => void
}

export function AcceptButton({ label, faceColor, margin, disabled, onClick, ...rect }: AcceptButtonProps) {
  return (
    <Button3D
      {...rect}
      label={label}
      faceColor={faceColor}
      basePpu={1}
      ppu={1.4}
      disabled={disabled}
      onClick={onClick}
      text={{ fontSize: 72, auto: undefined, margin, nowrap: true }}
    />
  )
}
