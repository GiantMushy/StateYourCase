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
import { Stage } from './ui/Stage'

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
    <Stage>
      <Background color={bgColor} />
      <DragLayerProvider>
        <div style={{ position: 'absolute', inset: 0 }}>
          <ActiveScreen key={visit} />
        </div>
      </DragLayerProvider>
      <Transition />
      <Menu />
    </Stage>
  )
}
