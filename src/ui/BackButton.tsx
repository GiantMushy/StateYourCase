import { TintButton } from './TintButton'

/** The top-left arrow used on every screen (identical RectTransform everywhere). */
export function BackButton({ onClick }: { onClick: () => void }) {
  return <TintButton pos={[-375, 900]} size={[512, 532]} scale={0.2} image={{ sprite: 'back_0' }} onClick={onClick} />
}
