// First screen: choose Local (pass-the-phone) or Online.
import { useGame } from '../game/store'
import { useT } from '../i18n'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'

export function LocalVsOnline() {
  const t = useT()
  const setGameMode = useGame((s) => s.setGameMode)
  const setScreen = useGame((s) => s.setScreen)

  return (
    <Screen>
      <Img pos={[12.5, 415]} size={[775, 600]} sprite="State your Case" />
      <Button3D
        pos={[0, -500]}
        size={[750, 200]}
        label={t('Local_text')}
        text={{ fontSize: 140, auto: [72, 140], margin: [38.137, 0, 36.667, 41.2] }}
        textExtra={
          <Text a={[0, 0.5, 1, 0.5]} pos={[0, -43]} size={[0, 40]} fontSize={40}>
            {t('Local_info')}
          </Text>
        }
        onClick={() => {
          setGameMode('Local')
          setScreen('PackSelection')
        }}
      />
      <Button3D
        pos={[0, -750]}
        size={[750, 200]}
        label={t('Online_text')}
        textRect={{ pos: [0, 8.25], size: [0, -6.5] }}
        text={{ fontSize: 140, auto: [72, 140], margin: [38.137, 0, 36.667, 37.213] }}
        textExtra={
          <Text a={[0, 0.5, 1, 0.5]} pos={[0, -46]} size={[0, 40]} fontSize={40}>
            {t('Online_info')}
          </Text>
        }
        onClick={() => setScreen('HostVsJoin')}
      />
    </Screen>
  )
}
