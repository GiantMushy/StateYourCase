// Privacy hand-off between players (Unity PlayerMutexController): "Hand the Phone to" +
// the next player's (or group's) name, and an "I am X" / "We are X" button that continues
// to the screen queued by the store's `startMutex`.
import { useGame } from '../game/store'
import { useLang, useT } from '../i18n'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'

export function PlayerMutex() {
  const t = useT()
  const lang = useLang()
  const mutex = useGame((s) => s.mutex)
  const exitMutex = useGame((s) => s.exitMutex)

  const name = mutex?.name ?? ''
  const prefix = mutex?.prefix === 'We are ' ? t('WeArePrefix') : t('IAmPrefix')

  return (
    <Screen>
      {/* HeaderDisplayController: one child per language. */}
      <Rect pos={[0, 555]} size={[1223.6, 455]} scale={0.8}>
        {lang === 'is' ? (
          <Img pos={[5.35, 0]} size={[1092.82, 455]} sprite="Réttu símann til" preserve />
        ) : (
          <Img size={[920, 455]} sprite="Hand the Phone to" preserve />
        )}
      </Rect>
      <Text size={[800, 300]} fontSize={200} color="#414141FF">
        {name}
      </Text>
      <Button3D pos={[0, -750]} size={[750, 200]} label={prefix + name} onClick={exitMutex} />
    </Screen>
  )
}
