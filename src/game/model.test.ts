import { describe, expect, it } from 'vitest'
import { loadCorruptions, loadTopics } from './database'
import * as M from './model'

const mkGame = () => {
  const g = M.createGameData(loadTopics(), loadCorruptions())
  ;['Anna', 'Bjarki', 'Thor', 'Gunna', 'Siggi', 'Lilja', 'Dóri'].forEach((n, i) => M.addPlayer(g, i, n))
  const g1 = M.createGroup(g, 'Group 1')
  const g2 = M.createGroup(g, 'Group 2')
  ;[1, 3, 5].forEach((id) => (g.players[id].groupId = g1.id))
  ;[2, 4, 6].forEach((id) => (g.players[id].groupId = g2.id))
  return g
}

describe('database', () => {
  it('loads topics and corruptions from the CSVs', () => {
    const topics = loadTopics()
    expect(topics.length).toBeGreaterThan(20)
    expect(topics.find((t) => t.id === 38)).toMatchObject({ type: 'Versus', optionA: 'Coffee', pack: 'Default' })
    const corruptions = loadCorruptions()
    expect(corruptions.find((c) => c.id === 10)).toMatchObject({ type: 'Speech', points: 40 })
    expect(corruptions.every((c) => c.type !== 'Civilian')).toBe(true)
  })
})

describe('scoring', () => {
  it('DM is the lowest id unless overridden', () => {
    const g = mkGame()
    expect(M.dmId(g)).toBe(0)
    g.dmIdOverride = 3
    expect(M.dmId(g)).toBe(3)
  })

  it('corruption toggle tracks score and gross corruption', () => {
    const g = mkGame()
    g.players[1].corruptionId = 10
    M.setCorruptionCompleted(g, 1, true)
    expect(g.players[1]).toMatchObject({ score: 40, roundCorruptionScore: 40 })
    M.setCorruptionCompleted(g, 1, false)
    expect(g.players[1]).toMatchObject({ score: 0, roundCorruptionScore: 0 })
  })

  it('correct accusation steals points and reverses a completed corruption', () => {
    const g = mkGame()
    g.players[5].corruptionId = 44 // 160 pts betrayal
    M.setCorruptionCompleted(g, 5, true)
    M.resolveCorrectAccusation(g, 4, 5)
    expect(g.players[4]).toMatchObject({ stolenScore: 160, score: 160, hasAccused: true })
    expect(g.players[5]).toMatchObject({ score: 0, roundCorruptionScore: 0, isAccused: true })
    // Accused players can no longer complete their corruption.
    M.setCorruptionCompleted(g, 5, true)
    expect(g.players[5].score).toBe(0)
  })

  it('incorrect accusation costs the configured penalty', () => {
    const g = mkGame()
    M.resolveIncorrectAccusation(g, 2)
    expect(g.players[2]).toMatchObject({ penaltyScore: 20, score: -20, hasAccused: true })
  })

  it('metric awards double with only two groups', () => {
    const g = mkGame()
    M.applyMetricBallot(g, [1, 1])
    expect(g.groups[1]).toMatchObject({ metric1Score: 70, metric2Score: 70, score: 140 })
  })

  it('commits round scores into oldScore and resets counters', () => {
    const g = mkGame()
    M.applyMetricBallot(g, [1, 0])
    g.players[2].corruptionId = 11
    M.setCorruptionCompleted(g, 2, true)
    M.commitRoundScores(g)
    expect(g.players[2].oldScore).toBe(70 + 60)
    expect(g.players[1].oldScore).toBe(70)
    expect(g.players[2].score).toBe(0)
    expect(g.groups[0].score).toBe(0)
  })
})

describe('group voting', () => {
  const fourGroups = () => {
    const g = M.createGameData([], loadCorruptions())
    ;['DM', 'A', 'B', 'C', 'D'].forEach((n, i) => M.addPlayer(g, i, n))
    for (let i = 1; i <= 4; i++) {
      const grp = M.createGroup(g, `G${i}`)
      g.players[i].groupId = grp.id
    }
    return g
  }

  it('awards 100/75/50 to the top three of four groups', () => {
    const g = fourGroups()
    M.applyGroupBallot(g, [1, 2, 3]) // G2 3, G3 2, G4 1
    M.applyGroupBallot(g, [1, 3, 0])
    M.finalizeGroupVoting(g)
    expect(g.groups[1].voteScore).toBe(100)
    expect(g.groups[3].voteScore).toBe(75)
    expect(g.groups[2].voteScore).toBe(50)
    expect(g.groups[0].voteScore).toBe(0)
    expect(Object.values(g.groups).every((x) => x.votingPhasePoints === 0)).toBe(true)
  })

  it('a completed zero-votes betrayal wipes the group vote points', () => {
    const g = fourGroups()
    const betrayal = g.corruptions.find((c) => c.requiresZeroGroupVotes)
    if (!betrayal) return
    g.players[2].corruptionId = betrayal.id
    M.setCorruptionCompleted(g, 2, true)
    M.applyGroupBallot(g, [1, 2, 3])
    M.finalizeGroupVoting(g)
    expect(g.groups[1].voteScore).toBe(75) // G3 wins instead of G2
  })
})

describe('corruption assignment', () => {
  it('never assigns to the DM, never repeats, and covers at least 25%', () => {
    const g = mkGame()
    for (let round = 0; round < 3; round++) {
      M.assignCorruptionsToPlayers(g)
      expect(g.players[0].corruptionId).toBe(-1)
      const assigned = M.nonDmPlayers(g).filter((p) => p.corruptionId >= 0)
      expect(assigned.length).toBeGreaterThanOrEqual(Math.floor(6 * 0.25))
    }
    expect(new Set(g.usedCorruptionIds).size).toBe(g.usedCorruptionIds.length)
  })
})

describe('topics', () => {
  it('draws unseen topics and resets a type when exhausted', () => {
    const g = mkGame()
    const n = g.topics.filter((t) => t.type === 'Versus' && t.pack === 'Default').length
    const seen = new Set<number>()
    for (let i = 0; i < n; i++) seen.add(M.getRandomTopic(g, 'Versus', 2)!.id)
    expect(seen.size).toBe(n)
    expect(M.getRandomTopic(g, 'Versus', 2)).not.toBeNull()
  })
})
