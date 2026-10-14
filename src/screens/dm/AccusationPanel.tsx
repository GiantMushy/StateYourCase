// Accusation sub-panel of the DM screen (Unity AccusationController). Three steps: pick the
// accusing player → pick the accused (only they stay red) → resolve with Correct/Incorrect.
// Clicking the accuser again cancels; clicking the target again deselects it. Each player
// may accuse once per round (Player.hasAccused disables their button).
import { useState } from 'react'
import * as M from '../../game/model'
import { useGame } from '../../game/store'
import { useT } from '../../i18n'
import { Rect, type RectProps } from '../../ui/Rect'
import { Text } from '../../ui/Text'
import { AcceptButton } from './AcceptButton'
import { PlayerAccButton } from './PlayerAccButton'

/** The scene has eight player buttons (Player1 → Player8); extra players are not listed. */
const MAX_BUTTONS = 8
/** CanvasGroup alpha on Correct when the target has no corruption (can only be incorrect). */
const CORRECT_DISABLED_ALPHA = 0.55

type Step = { kind: 'Default' } | { kind: 'PlayerSelected'; accuser: number } | { kind: 'TargetSelected'; accuser: number; target: number }

export function AccusationPanel(rect: RectProps) {
  const t = useT()
  const game = useGame((s) => s.game)
  const update = useGame((s) => s.update)
  const [step, setStep] = useState<Step>({ kind: 'Default' })

  const players = M.nonDmPlayers(game).slice(0, MAX_BUTTONS)
  const name = (id: number) => game.players[id]?.name ?? ''

  const onPlayerClicked = (id: number) => {
    if (step.kind === 'Default') setStep({ kind: 'PlayerSelected', accuser: id })
    else if (id === step.accuser) setStep({ kind: 'Default' })
    else if (step.kind === 'TargetSelected' && id === step.target) setStep({ kind: 'PlayerSelected', accuser: step.accuser })
    else setStep({ kind: 'TargetSelected', accuser: step.accuser, target: id })
  }

  const resolve = (correct: boolean) => {
    if (step.kind !== 'TargetSelected') return
    const { accuser, target } = step
    update((g) => (correct ? M.resolveCorrectAccusation(g, accuser, target) : M.resolveIncorrectAccusation(g, accuser)))
    setStep({ kind: 'Default' })
  }

  const description =
    step.kind === 'Default'
      ? t('First Accusation Directions')
      : step.kind === 'PlayerSelected'
        ? t('AccuserSelected', name(step.accuser))
        : t('TargetSelected', name(step.accuser), name(step.target))

  // Accept buttons are hidden with a CanvasGroup (alpha 0, no raycasts) so they keep their
  // layout slot. Correct needs a target that actually has a corruption.
  const accepting = step.kind === 'TargetSelected'
  const targetHasCorruption = accepting && (game.players[step.target]?.corruptionId ?? -1) >= 0

  return (
    <Rect {...rect}>
      {/* VerticalLayoutGroup: spacing 15, upper centre. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
        <Text flow size={[750, 120]} fontSize={130} color="#3F3F3FFF">
          {t('Accusation!')}
        </Text>
        <Text flow size={[750, 261.1]} fontSize={53} color="#3F3F3FFF" ls={-15}>
          {description}
        </Text>

        {players.map((p) => {
          const selecting = step.kind !== 'Default'
          const isAccuser = selecting && p.id === step.accuser
          const crossfire =
            step.kind === 'PlayerSelected' ? !isAccuser : step.kind === 'TargetSelected' ? p.id === step.target : false
          return (
            <PlayerAccButton
              key={p.id}
              flow
              size={[700, 110]}
              name={p.name}
              // Everyone but the accuser shows the pointing hand until the accusation ends.
              icon={selecting && !isAccuser ? 'point_shadow_0' : 'gavel_icon'}
              crossfire={crossfire}
              // While choosing, every player is a valid target (even ones who already accused).
              disabled={!selecting && p.hasAccused}
              onClick={() => onPlayerClicked(p.id)}
            />
          )
        })}

        <Rect flow size={[700, 100]}>
          <AcceptButton
            a={[0, 1, 0, 1]}
            pos={[175, -70]}
            size={[330, 140]}
            label={t('Correct')}
            faceColor="#60FB8DFF"
            margin={[-0.708, 0, 2.139, 0]}
            disabled={!accepting || !targetHasCorruption}
            onClick={() => resolve(true)}
            style={{
              opacity: accepting ? (targetHasCorruption ? 1 : CORRECT_DISABLED_ALPHA) : 0,
              pointerEvents: accepting ? 'auto' : 'none',
            }}
          />
          <AcceptButton
            a={[0, 1, 0, 1]}
            pos={[525, -70]}
            size={[330, 140]}
            label={t('Incorrect')}
            faceColor="#F26B6BFF"
            margin={[1.45, 0, 2.139, 0]}
            disabled={!accepting}
            onClick={() => resolve(false)}
            style={{ opacity: accepting ? 1 : 0, pointerEvents: accepting ? 'auto' : 'none' }}
          />
        </Rect>
      </div>
    </Rect>
  )
}
