// Pure game rules operating on a mutable GameData object (safe inside an immer draft).
// Each function mirrors a method on the Unity managers; names are kept close so the two
// codebases can be compared side by side.
import { CONFIG } from './config'
import type { Corruption, CorruptionType, Group, Metric, Pack, Player, Topic, TopicType } from './types'

export type Rng = () => number

export interface GameData {
  players: Record<number, Player>
  groups: Record<number, Group>
  nextGroupId: number
  /** Explicit DM. Falls back to the lowest player id when unset or stale. */
  dmIdOverride: number

  topics: Topic[]
  selectedPack: Pack
  currentTopic: Topic | null
  seenTopicIds: number[]

  corruptions: Corruption[]
  usedCorruptionIds: number[]
  completedCorruptionIds: number[]

  selectedMetrics: Metric[]
  currentRound: number
}

export function createGameData(topics: Topic[], corruptions: Corruption[]): GameData {
  return {
    players: {},
    groups: {},
    nextGroupId: 0,
    dmIdOverride: -1,
    topics,
    selectedPack: 'Default',
    currentTopic: null,
    seenTopicIds: [],
    corruptions,
    usedCorruptionIds: [],
    completedCorruptionIds: [],
    selectedMetrics: [],
    currentRound: 1,
  }
}

// ---------------------------------------------------------------- players & groups

export const playerList = (g: GameData) => Object.values(g.players).sort((a, b) => a.id - b.id)
export const groupList = (g: GameData) => Object.values(g.groups).sort((a, b) => a.id - b.id)

export function dmId(g: GameData): number {
  if (g.dmIdOverride >= 0 && g.players[g.dmIdOverride]) return g.dmIdOverride
  const ids = Object.keys(g.players).map(Number)
  return ids.length ? Math.min(...ids) : -1
}

export const nonDmPlayers = (g: GameData) => playerList(g).filter((p) => p.id !== dmId(g))
export const playersInGroup = (g: GameData, groupId: number) => playerList(g).filter((p) => p.groupId === groupId)

export function addPlayer(g: GameData, id: number, name: string) {
  if (g.players[id]) return
  g.players[id] = {
    id,
    name,
    score: 0,
    roundCorruptionScore: 0,
    stolenScore: 0,
    penaltyScore: 0,
    oldScore: 0,
    groupId: -1,
    corruptionId: -1,
    hasAccused: false,
    isAccused: false,
  }
}

export function removePlayer(g: GameData, id: number) {
  delete g.players[id]
}

export function createGroup(g: GameData, name: string): Group {
  const group: Group = {
    id: g.nextGroupId++,
    name,
    score: 0,
    voteScore: 0,
    metric1Score: 0,
    metric2Score: 0,
    position: 'For',
    votingPhasePoints: 0,
  }
  g.groups[group.id] = group
  return group
}

export function clearAllGroups(g: GameData) {
  g.groups = {}
  g.nextGroupId = 0
  g.dmIdOverride = -1
  for (const p of Object.values(g.players)) p.groupId = -1
}

// ---------------------------------------------------------------- scoring

export function addRoundCorruptionScore(g: GameData, playerId: number, amount: number) {
  const p = g.players[playerId]
  p.roundCorruptionScore += amount
  p.score += amount
}

export function subtractRoundCorruptionScore(g: GameData, playerId: number, amount: number) {
  addRoundCorruptionScore(g, playerId, -amount)
}

export function addStolenScore(g: GameData, playerId: number, amount: number) {
  const p = g.players[playerId]
  p.stolenScore += amount
  p.score += amount
}

export function addPenaltyScore(g: GameData, playerId: number, amount: number) {
  const p = g.players[playerId]
  p.penaltyScore += amount
  p.score -= amount
}

const groupScoreOf = (g: GameData, p: Player) => g.groups[p.groupId]?.score ?? 0

/** oldScore + group round score + personal round net — what the Scoreboard animates to. */
export const playerGameTotal = (g: GameData, p: Player) => p.oldScore + groupScoreOf(g, p) + p.score

export function hasAnyPlayerReachedScore(g: GameData, threshold: number) {
  return nonDmPlayers(g).some((p) => playerGameTotal(g, p) >= threshold)
}

function resetGroupRound(group: Group) {
  group.score = 0
  group.voteScore = 0
  group.metric1Score = 0
  group.metric2Score = 0
  group.votingPhasePoints = 0
}

/** Folds this round's net into oldScore and zeroes every per-round counter. */
export function commitRoundScores(g: GameData) {
  for (const p of Object.values(g.players)) {
    p.oldScore += groupScoreOf(g, p) + p.score
    p.score = 0
    p.roundCorruptionScore = 0
    p.stolenScore = 0
    p.penaltyScore = 0
  }
  Object.values(g.groups).forEach(resetGroupRound)
}

export function resetAllScores(g: GameData) {
  for (const p of Object.values(g.players)) {
    p.score = 0
    p.roundCorruptionScore = 0
    p.stolenScore = 0
    p.penaltyScore = 0
    p.oldScore = 0
  }
  Object.values(g.groups).forEach(resetGroupRound)
}

export function resetAccusations(g: GameData) {
  for (const p of Object.values(g.players)) {
    p.hasAccused = false
    p.isAccused = false
  }
}

export const isGameOver = (g: GameData) =>
  g.currentRound >= CONFIG.totalRounds || hasAnyPlayerReachedScore(g, CONFIG.winScoreThreshold)

// ---------------------------------------------------------------- topics

export function packTopics(g: GameData) {
  return g.topics.filter((t) => t.pack === g.selectedPack)
}

/** Random unseen topic of a type within ±1 seriousness; resets that type's history when exhausted. */
export function getRandomTopic(g: GameData, type: TopicType, seriousness: number, rng: Rng = Math.random): Topic | null {
  const unseen = () =>
    packTopics(g).filter(
      (t) => t.type === type && Math.abs(t.seriousness - seriousness) <= 1 && !g.seenTopicIds.includes(t.id),
    )
  let candidates = unseen()
  if (candidates.length === 0) {
    const ofType = new Set(g.topics.filter((t) => t.type === type).map((t) => t.id))
    g.seenTopicIds = g.seenTopicIds.filter((id) => !ofType.has(id))
    candidates = unseen()
  }
  if (candidates.length === 0) return null
  const topic = candidates[Math.floor(rng() * candidates.length)]
  g.seenTopicIds.push(topic.id)
  return topic
}

// ---------------------------------------------------------------- corruptions

export function corruptionOf(g: GameData, playerId: number): Corruption | null {
  const p = g.players[playerId]
  if (!p || p.corruptionId < 0) return null
  return g.corruptions.find((c) => c.id === p.corruptionId) ?? null
}

export const isCompleted = (g: GameData, corruptionId: number) => g.completedCorruptionIds.includes(corruptionId)

function setCompleted(g: GameData, corruptionId: number, done: boolean) {
  g.completedCorruptionIds = g.completedCorruptionIds.filter((id) => id !== corruptionId)
  if (done) g.completedCorruptionIds.push(corruptionId)
}

function randomUnusedCorruption(g: GameData, type: CorruptionType, solo: boolean, rng: Rng) {
  const candidates = g.corruptions.filter(
    (c) => c.type === type && !g.usedCorruptionIds.includes(c.id) && (!solo || !c.requiresTeammate),
  )
  return candidates.length ? candidates[Math.floor(rng() * candidates.length)] : null
}

function isSoloGroup(g: GameData, p: Player) {
  return p.groupId >= 0 && playersInGroup(g, p.groupId).length <= 1
}

function give(g: GameData, p: Player, c: Corruption) {
  p.corruptionId = c.id
  g.usedCorruptionIds.push(c.id)
}

/** Weighted assignment: Speech 40%, Interruption 20%, Betrayal 5%, Civilian 35%, then a 25% coverage back-fill. */
export function assignCorruptionsToPlayers(g: GameData, rng: Rng = Math.random) {
  const dm = dmId(g)
  for (const p of playerList(g)) {
    p.corruptionId = -1
    if (p.id === dm) continue
    const roll = rng()
    const type: CorruptionType | null =
      roll < 0.4 ? 'Speech' : roll < 0.6 ? 'Interruption' : roll < 0.65 ? 'Betrayal' : null
    if (!type) continue
    const c = randomUnusedCorruption(g, type, isSoloGroup(g, p), rng)
    if (c) give(g, p, c)
  }
  ensureMinimumCoverage(g, rng)
}

function ensureMinimumCoverage(g: GameData, rng: Rng) {
  const others = nonDmPlayers(g)
  if (others.length <= 2) return
  const target = Math.floor(others.length * 0.25)
  const have = others.filter((p) => p.corruptionId >= 0).length
  if (have >= target) return
  const candidates = others
    .filter((p) => p.corruptionId < 0)
    .map((p) => ({ p, k: rng() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, target - have)
    .map((x) => x.p)
  const order: CorruptionType[] = ['Speech', 'Interruption', 'Betrayal']
  for (const p of candidates) {
    const roll = rng()
    const type: CorruptionType = roll < 40 / 65 ? 'Speech' : roll < 60 / 65 ? 'Interruption' : 'Betrayal'
    const solo = isSoloGroup(g, p)
    let c = randomUnusedCorruption(g, type, solo, rng)
    for (const fallback of order) {
      if (c) break
      if (fallback !== type) c = randomUnusedCorruption(g, fallback, solo, rng)
    }
    if (c) give(g, p, c)
  }
}

export function resetCorruptions(g: GameData) {
  g.usedCorruptionIds = []
  g.completedCorruptionIds = []
}

/** DM's corruption-card toggle. Updates score and the gross corruption counter together. */
export function setCorruptionCompleted(g: GameData, playerId: number, done: boolean) {
  const p = g.players[playerId]
  const c = corruptionOf(g, playerId)
  if (!p || !c || p.isAccused) return
  const was = isCompleted(g, c.id)
  if (done && !was) {
    setCompleted(g, c.id, true)
    addRoundCorruptionScore(g, playerId, c.points)
  } else if (!done && was) {
    setCompleted(g, c.id, false)
    subtractRoundCorruptionScore(g, playerId, c.points)
  }
}

// ---------------------------------------------------------------- accusations

/** Accuser steals the accused's corruption points; an already-completed corruption is reversed. */
export function resolveCorrectAccusation(g: GameData, accuserId: number, accusedId: number) {
  const c = corruptionOf(g, accusedId)
  const stolen = c ? c.points : 0
  if (c && isCompleted(g, c.id)) {
    subtractRoundCorruptionScore(g, accusedId, stolen)
    setCompleted(g, c.id, false)
  }
  addStolenScore(g, accuserId, stolen)
  g.players[accuserId].hasAccused = true
  g.players[accusedId].isAccused = true
}

export function resolveIncorrectAccusation(g: GameData, accuserId: number) {
  addPenaltyScore(g, accuserId, CONFIG.incorrectPenalty)
  g.players[accuserId].hasAccused = true
}

// ---------------------------------------------------------------- voting

/** One group's ballot: ranked group ids (slot 1, 2, 3). */
export function applyGroupBallot(g: GameData, rankedGroupIds: number[]) {
  rankedGroupIds.forEach((id, i) => {
    if (g.groups[id] && i < CONFIG.localVotePoints.length) g.groups[id].votingPhasePoints += CONFIG.localVotePoints[i]
  })
}

/** DM's metric ballot: groupId for metric slot 1 and 2 (may be the same group). */
export function applyMetricBallot(g: GameData, slotGroupIds: number[]) {
  const award = groupList(g).length <= 2 ? CONFIG.metricPoints * 2 : CONFIG.metricPoints
  slotGroupIds.forEach((id, i) => {
    const group = g.groups[id]
    if (!group) return
    if (i === 0) group.metric1Score += award
    else group.metric2Score += award
    group.score += award
  })
}

function awardVotePoints(group: Group, points: number) {
  if (points <= 0) return
  group.voteScore += points
  group.score += points
}

function groupHasCompletedVoteKillingBetrayal(g: GameData, groupId: number) {
  return playersInGroup(g, groupId).some((p) => {
    if (p.isAccused) return false
    const c = corruptionOf(g, p.id)
    return !!c && c.requiresZeroGroupVotes && isCompleted(g, c.id)
  })
}

/** Ranks groups by accumulated ballot points and awards final placement points. */
export function finalizeGroupVoting(g: GameData) {
  for (const group of Object.values(g.groups))
    if (groupHasCompletedVoteKillingBetrayal(g, group.id)) group.votingPhasePoints = 0

  // Stable sort by descending points, matching LINQ OrderByDescending over insertion order.
  const ranked = Object.values(g.groups)
    .map((group, i) => ({ group, i }))
    .sort((a, b) => b.group.votingPhasePoints - a.group.votingPhasePoints || a.i - b.i)
    .map((x) => x.group)

  const [first, second, third] = CONFIG.finalPlacePoints
  if (ranked.length === 2) {
    awardVotePoints(ranked[0], second)
  } else if (ranked.length === 3) {
    awardVotePoints(ranked[0], second)
    awardVotePoints(ranked[1], third)
  } else {
    ;[first, second, third].forEach((pts, i) => ranked[i] && awardVotePoints(ranked[i], pts))
  }
  for (const group of Object.values(g.groups)) group.votingPhasePoints = 0
}
