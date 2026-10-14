// Online-mode screens (Unity HostVsJoin / HostOnlineGame / JoinOnlineGame controllers).
// Networking was never implemented in Unity, so these are visual ports: navigation works,
// the lobby/join actions are inert, and a red "Coming Soon" banner sits across each lobby.
import { useState } from 'react'
import { useGame } from '../game/store'
import { useLang, useT } from '../i18n'
import { BackButton } from '../ui/BackButton'
import { Button3D } from '../ui/Button3D'
import { Img } from '../ui/Img'
import { Rect, STRETCH } from '../ui/Rect'
import { Screen } from '../ui/Screen'
import { Text } from '../ui/Text'
import { TmpInput } from './online/TmpInput'

/** Placeholders whose scene text doesn't match a string-table entry. */
const LOCAL = {
  hostNamePlaceholder: { en: 'Enter Your Name....', is: 'Þitt Nafn...' },
  roomKeyPlaceholder: { en: 'Room Key...', is: 'Lotukóði...' },
}

function ComingSoon() {
  return (
    <Text a={STRETCH} pos={[-7, -123]} size={[216.55, 0]} rot={27.382} font="Liberation" bold fontSize={150} color="#FF0000FF">
      Coming Soon
    </Text>
  )
}

export function HostVsJoin() {
  const t = useT()
  const setGameMode = useGame((s) => s.setGameMode)
  const setScreen = useGame((s) => s.setScreen)

  return (
    <Screen>
      <BackButton onClick={() => setScreen('LocalVsOnline')} />
      <Img pos={[12.5, 415]} size={[775, 600]} sprite="State your Case" />
      <Button3D
        pos={[0, -500]}
        size={[750, 200]}
        label={t('Host')}
        // The room is created after the host picks a pack (ContinueAfterPackSelection).
        onClick={() => {
          setGameMode('OnlineHost')
          setScreen('PackSelection')
        }}
      />
      <Button3D
        pos={[0, -750]}
        size={[750, 200]}
        label={t('Join')}
        onClick={() => {
          setGameMode('OnlineJoin')
          setScreen('JoinOnlineGame')
        }}
      />
    </Screen>
  )
}

export function HostOnlineGame() {
  const t = useT()
  const lang = useLang()
  const setScreen = useGame((s) => s.setScreen)
  // GameManager.GenerateRoomCode: System.Random.Next(100000, 999999).
  const [roomCode] = useState(() => String(100000 + Math.floor(Math.random() * 899999)))

  return (
    <Screen>
      <BackButton onClick={() => setScreen('PackSelection')} />
      <Text pos={[0, 728]} size={[1000, 100]} fontSize={100} color="#424242FF">
        {t('Room Number')}
      </Text>
      <Text pos={[0, 583.03]} size={[1000, 101.94]} fontSize={160} color="#424242FF">
        {roomCode}
      </Text>
      <TmpInput pos={[0, 398]} placeholder={LOCAL.hostNamePlaceholder[lang]} />

      {/* "Waiting For Players" panel: nobody can join, so it is always shown. */}
      <Rect a={[0, 0.5, 1, 0.5]} pos={[0, -212]} size={[0, 524]}>
        <Text pos={[0, 98]} size={[1000, 120.13]} fontSize={75} color="#42424296">
          {t('Waiting for players')}
        </Text>
        <Rect pos={[0, -38]} size={[449, 448]} scale={0.5} rot={40}>
          {/* Rotate component: 50°/s counter-clockwise. */}
          <div style={{ position: 'absolute', inset: 0, animation: 'spin 7.2s linear infinite reverse' }}>
            <Img sprite="German Seats" color="#42424296" />
          </div>
        </Rect>
      </Rect>

      {/* Inert: Unity's Next would start a game with only the host (no networking). */}
      <Button3D pos={[0, -868]} size={[750, 200]} label={t('Next')} />
      <ComingSoon />
    </Screen>
  )
}

export function JoinOnlineGame() {
  const t = useT()
  const lang = useLang()
  const setScreen = useGame((s) => s.setScreen)

  return (
    <Screen>
      <BackButton onClick={() => setScreen('HostVsJoin')} />
      <Img pos={[12.5, 415]} size={[775, 600]} sprite="State your Case" />
      <TmpInput pos={[0, -190]} placeholder={t('Your Name...')} borderColor="#282828FF" />
      <TmpInput pos={[0, -423]} placeholder={LOCAL.roomKeyPlaceholder[lang]} borderColor="#282828FF" />
      <Text pos={[-96, -99]} size={[500, 50]} fontSize={70} color="#282828C8" align="Left">
        {t('Name')}
      </Text>
      <Text pos={[-93, -331]} size={[500, 50]} fontSize={70} color="#282828C8" align="Left">
        {t('Key')}
      </Text>
      {/* Inert: GameManager.JoinOnlineGame was a TODO stub. */}
      <Button3D pos={[0, -750]} size={[750, 200]} label={t('Join')} />
      <ComingSoon />
    </Screen>
  )
}
