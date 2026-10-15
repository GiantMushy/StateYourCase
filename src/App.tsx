// Root layout mirrors the Unity "Screen Canvas": Background → active screen → transition
// overlay → drag layer → side menu. Only the active screen is mounted, so mounting a screen
// is the equivalent of the Unity panel's OnEnable.
import { useEffect, useState, type ComponentType } from 'react'
import { useGame } from './game/store'
import type { Screen } from './game/types'
import { AssignGroups } from './screens/AssignGroups'
import { AssignPositions } from './screens/AssignPositions'
import { CorruptionDisplay } from './screens/CorruptionDisplay'
import { DMDisplay } from './screens/DMDisplay'
import { LocalVsOnline } from './screens/LocalVsOnline'
import { MetricSelection } from './screens/MetricSelection'
import { HostOnlineGame, HostVsJoin, JoinOnlineGame } from './screens/Online'
import { PackSelection } from './screens/PackSelection'
import { PlayerMutex } from './screens/PlayerMutex'
import { Scoreboard } from './screens/Scoreboard'
import { StartLocalGame } from './screens/StartLocalGame'
import { TopicSelection } from './screens/TopicSelection'
import { Voting } from './screens/Voting'
import { Background } from './shell/Background'
import { Menu } from './shell/Menu'
import { Transition } from './shell/Transition'
import { DragLayerProvider } from './ui/DragLayer'
import { preloadSprites } from './ui/sprites'
import { heightForCentreButton, heightForTopButton, Stage } from './ui/Stage'

const SCREENS: Record<Screen, ComponentType> = {
  LocalVsOnline,
  HostVsJoin,
  HostOnlineGame,
  JoinOnlineGame,
  PackSelection,
  StartLocalGame,
  AssignGroups,
  TopicSelection,
  MetricSelection,
  AssignPositions,
  PlayerMutex,
  CorruptionDisplay,
  DMDisplay,
  Voting,
  Scoreboard,
}

/**
 * Screens whose bottom button sits lower than the standard Next (-750): on wide windows they get a
 * taller, narrower canvas so the button lands at the standard height (see Stage).
 */
const MIN_HEIGHT: Partial<Record<Screen, number>> = {
  // Select: VerticalLayoutGroup pad 200, children 364.2 / 129.07 / 220 / 600 / 223.16, spacing 60.
  TopicSelection: heightForTopButton(200 + 364.2 + 60 + 129.07 + 60 + 220 + 60 + 600 + 60 + 223.16 / 2),
  MetricSelection: heightForCentreButton(-840),
  Voting: heightForCentreButton(-840),
  HostOnlineGame: heightForCentreButton(-868),
}

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.all([preloadSprites(), document.fonts.load('100px Iceland')]).then(() => setReady(true))
  }, [])

  const screen = useGame((s) => s.screen)
  const visit = useGame((s) => s.screenVisit)
  const bgColor = useGame((s) => s.bgColor)
  const ActiveScreen = SCREENS[screen]

  if (!ready) return null
  return (
    <Stage
      backdrop={<Background color={bgColor} />}
      overlay={
        <>
          <Transition />
          <Menu />
        </>
      }
      minHeight={MIN_HEIGHT[screen]}
      // The pack carousel spreads into the side bands on wide windows.
      bleedX={screen === 'PackSelection'}
    >
      <DragLayerProvider>
        <div style={{ position: 'absolute', inset: 0 }}>
          <ActiveScreen key={visit} />
        </div>
      </DragLayerProvider>
    </Stage>
  )
}
