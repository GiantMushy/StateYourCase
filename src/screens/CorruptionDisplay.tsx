// Per-player corruption reveal (Unity CorruptionDisplayController), shown after each
// PlayerMutex hand-off. The card starts hidden; pointer-down flips it to the revealed face
// and release flips it back. "I'm done!" appears after the first reveal.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import * as M from '../game/model'
import { useGame } from '../game/store'
import type { CorruptionType } from '../game/types'
import { useLang, useT } from '../i18n'
import { clamp01, lerp, tween } from '../ui/anim'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { CARD_SPRITE, TEXT_COLOR, TYPE_LABEL } from './corruption/style'

/** Inspector flipDuration: half to turn the outgoing face sideways, half to open the new one. */
const FLIP_DURATION = 0.2

/** Inspector spy-icon tints (spySpeechColor / spyInterruptionColor / spyBetrayalColor). */
const SPY_COLOR: Record<CorruptionType, string> = {
  Speech: '#008D00FF',
  Interruption: '#5108CCFF',
  Betrayal: '#B21C1DFF',
  Civilian: '#FFFFFFFF',
}

type Face = 'hidden' | 'revealed'

/**
 * FlipCoroutine: linear X-scale of the visible face to 0, swap faces, then 0 → 1. Only the
 * visible face is ever scaled (the other is reset to 1 at the swap), so one number is enough.
 * A new flip restarts from the visible face's current scale, like StopCoroutine + restart.
 */
function useCardFlip() {
  const [face, setFace] = useState<Face>('hidden')
  const [scaleX, setScaleX] = useState(1)
  const st = useRef({ face: 'hidden' as Face, scaleX: 1, cancel: null as (() => void) | null })

  useEffect(() => () => st.current.cancel?.(), [])

  const flipTo = (toRevealed: boolean) => {
    const s = st.current
    s.cancel?.()
    const half = FLIP_DURATION / 2
    const setX = (x: number) => {
      s.scaleX = x
      setScaleX(x)
    }
    const startX = s.scaleX
    s.cancel = tween(half, (t) => setX(lerp(startX, 0, clamp01(t))), () => {
      s.face = toRevealed ? 'revealed' : 'hidden'
      setFace(s.face)
      setX(0)
      s.cancel = tween(half, (t) => setX(lerp(0, 1, clamp01(t))), () => (s.cancel = null))
    })
  }

  // `isRevealed` flips at the swap midpoint, so a quick tap released during the first
  // half-flip leaves the card revealed (Unity's OnPointerUp sees isRevealed == false).
  const isRevealed = () => st.current.face === 'revealed'
  return { face, scaleX, flipTo, isRevealed }
}

export function CorruptionDisplay() {
  const t = useT()
  const lang = useLang()
  const playerId = useGame((s) => s.corruptionOrder[s.corruptionIndex])
  const corruption = useGame((s) => (playerId === undefined ? null : M.corruptionOf(s.game, playerId)))
  const advanceCorruptionSequence = useGame((s) => s.advanceCorruptionSequence)

  const { face, scaleX, flipTo, isRevealed } = useCardFlip()
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false)

  // The panel root is the IPointerDown/UpHandler; presses on the card or header bubble to it.
  // Pointer capture makes the release arrive here even off the card (Unity pointerPress).
  const press = {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      if (isRevealed()) return
      flipTo(true)
      setHasBeenRevealed(true)
    },
    onPointerUp: () => isRevealed() && flipTo(false),
    onPointerCancel: () => isRevealed() && flipTo(false),
    style: { touchAction: 'none' as const },
  }

  const type: CorruptionType = corruption?.type ?? 'Civilian'
  const civilian = type === 'Civilian'
  const color = TEXT_COLOR[type]
  const description = corruption
    ? lang === 'is' && corruption.descriptionIs
      ? corruption.descriptionIs
      : corruption.description
    : t('CivilianText')

  return (
    <Screen>
      {/* HeaderDisplayController: one child per language. */}
      <Rect pos={[0, 555]} size={[1398.4, 305]} scale={0.7}>
        {lang === 'is' ? (
          <Rect pos={[6.26, -35.5]} size={[1262, 376]} {...press}>
            <Img sprite="Spillingin þín" preserve />
          </Rect>
        ) : (
          <Rect size={[1408, 447]} {...press}>
            <Img sprite="Your Corruption" preserve />
          </Rect>
        )}
      </Rect>

      {face === 'hidden' ? (
        <Rect pos={[0, -105]} size={[800, 663.86]} scale={[scaleX, 1]} {...press}>
          <Img sprite="Button Default" sliced />
          <Text a={[0, 0.5, 1, 0.5]} pos={[0, -111]} size={[0, 191.08]} fontSize={90} color="#414141E2" align="Top">
            {t('Hold or tap to reveal your Corruption')}
          </Text>
          <Img pos={[0, 128]} size={[100, 100]} scale={1.5} sprite="secobj_icon_0" />
        </Rect>
      ) : (
        <Rect pos={[0, -105]} size={[800, 663.86]} scale={[scaleX, 1]} {...press}>
          <Img sprite={CARD_SPRITE[type]} sliced ppu={1.3} />
          <Text a={[0, 1, 1, 1]} pos={[0, -77]} size={[0, 109.48]} fontSize={100} color={color} align="TopLeft" margin={[49.179, 4.74, 49.038, 0]}>
            {t(TYPE_LABEL[type])}
          </Text>
          <Text a={[0, 0.5, 1, 0.5]} pos={[0, 10.95]} size={[0, 353.36]} fontSize={65} color={color} align="Left" margin={[50, 0, 50.611, 0]}>
            {description}
          </Text>
          {!civilian && corruption && (
            <>
              <Text a={[0, 0, 1, 0]} pos={[0, 100]} size={[0, 75]} fontSize={90} color={color} align="Right" margin={[295.957, 0, 290.122, 0]}>
                {corruption.points}
              </Text>
              <Text a={[0, 0, 1, 0]} pos={[0, 100]} size={[0, 75]} fontSize={90} color={color} align="Right" margin={[499.696, 0, 50, 0]}>
                {t('Points_Full')}
              </Text>
            </>
          )}
          {civilian ? (
            <Img a={[0, 0, 0, 0]} pos={[126.79, 104.59]} size={[150, 150]} sprite="civilian_icon" />
          ) : (
            <Img a={[0, 0, 0, 0]} pos={[126.79, 104.59]} size={[100, 100]} sprite="secobj_icon_white_0" color={SPY_COLOR[type]} />
          )}
        </Rect>
      )}

      {hasBeenRevealed && <Button3D pos={[0, -750]} size={[750, 200]} label={t('Im_Done')} onClick={advanceCorruptionSequence} />}
    </Screen>
  )
}
