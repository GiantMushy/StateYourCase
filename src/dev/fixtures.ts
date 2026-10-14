// Dev-only deep links: open any screen with deterministic state matching the Unity
// reference captures (reference/unity/screenshots). Usage:
//   /?screen=DMDisplay            two groups (Unity capture setup)
//   /?screen=Voting&groups=4      four groups, group-voting phase
//   /?screen=Scoreboard&round=2   round 2 with committed old scores
//   /?lang=is                     Icelandic
import { useGame } from '../game/store'
import * as M from '../game/model'
import type { Screen } from '../game/types'

const NAMES = ['Anna', 'Bjarki', 'Thor', 'Gunna', 'Siggi', 'Lilja', 'Dóri']

export function applyDevFixture() {
  const params = new URLSearchParams(location.search)
  const lang = params.get('lang')
  if (lang === 'is' || lang === 'en') useGame.getState().setLanguage(lang)
  const screen = params.get('screen') as Screen | null
  if (!screen) return

  const groupCount = Number(params.get('groups') ?? 2)
  const round = Number(params.get('round') ?? 1)

  useGame.setState((s) => {
    const g = s.game
    NAMES.forEach((n, i) => M.addPlayer(g, i, n))
    s.nextPlayerId = NAMES.length
    g.dmIdOverride = 0
    const layout =
      groupCount === 4
        ? [[1, 3], [2, 4], [6], [5]]
        : [
            [1, 3, 5],
            [2, 4, 6],
          ]
    layout.forEach((ids, i) => {
      const group = M.createGroup(g, i === 2 && groupCount === 4 ? 'The Owls' : `Group ${i + 1}`)
      group.position = i % 2 === 0 ? 'Against' : 'For'
      ids.forEach((id) => (g.players[id].groupId = group.id))
    })
    s.groupsLayout = { dmPlayerId: 0, groups: layout.map((playerIds) => ({ playerIds, customName: '' })), unassigned: [] }
    const give = (pid: number, cid: number) => {
      g.players[pid].corruptionId = cid
      g.usedCorruptionIds.push(cid)
    }
    give(1, 10)
    give(2, 11)
    give(3, 30)
    give(5, 44)
    g.currentTopic = g.topics.find((t) => t.id === 38) ?? g.topics[0]
    g.selectedMetrics = ['Factual', 'Comedy']
    g.currentRound = round

    if (screen === 'Scoreboard' || round > 1) {
      // Round-1 style results: Group 2 won both metrics, Bjarki/Thor completed, Siggi stole from Lilja.
      M.applyMetricBallot(g, [1, 1])
      M.setCorruptionCompleted(g, 1, true)
      M.setCorruptionCompleted(g, 2, true)
      M.resolveCorrectAccusation(g, 4, 5)
      if (round > 1) {
        M.commitRoundScores(g)
        M.applyMetricBallot(g, [0, 1])
      }
    }

    s.corruptionOrder = M.nonDmPlayers(g).map((p) => p.id)
    s.corruptionIndex = 0
    s.votingGroupOrder = M.groupList(g).map((x) => x.id)
    s.votingGroupIndex = 0
    s.isDMMetricVoting = params.get('dmvote') === '1' || groupCount <= 2
    s.mutex = { name: params.get('mutex') ?? 'Anna', prefix: params.get('mutex')?.startsWith('Group') ? 'We are ' : 'I am ', next: 'TopicSelection' }
    s.screen = screen
    s.screenVisit++
  })
}
