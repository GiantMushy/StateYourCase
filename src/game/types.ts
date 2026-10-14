// Core game data types. Mirrors the Unity Partyament model (GameManager / PlayerManager /
// TopicManager / CorruptionManager) so scoring and flow behave identically.

export type Screen =
  | 'LocalVsOnline'
  | 'HostVsJoin'
  | 'HostOnlineGame'
  | 'JoinOnlineGame'
  | 'PackSelection'
  | 'StartLocalGame'
  | 'AssignGroups'
  | 'TopicSelection'
  | 'MetricSelection'
  | 'AssignPositions'
  | 'PlayerMutex'
  | 'CorruptionDisplay'
  | 'DMDisplay'
  | 'Voting'
  | 'Scoreboard'

export type Language = 'en' | 'is'
export type Pack = 'Default' | 'Icelandic' | 'EighteenPlus' | 'Political' | 'PopCulture'
export type Position = 'For' | 'Against'
export type CorruptionType = 'Civilian' | 'Speech' | 'Interruption' | 'Betrayal'
export type Metric = 'Comedy' | 'Creativity' | 'OnTopic' | 'Factual' | 'Enthusiasm'
export type TopicType = 'Versus' | 'Scenarios'
export type GameMode = 'Local' | 'OnlineHost' | 'OnlineJoin'

export interface Player {
  id: number
  name: string
  /** Personal net for the current round: +corruption +stolen −penalty −accused loss. */
  score: number
  /** Gross corruption earned this round; never reduced by accusations. */
  roundCorruptionScore: number
  stolenScore: number
  penaltyScore: number
  /** Committed net earnings from all previous rounds. */
  oldScore: number
  groupId: number
  corruptionId: number
  hasAccused: boolean
  isAccused: boolean
}

export interface Group {
  id: number
  name: string
  /** Always voteScore + metric1Score + metric2Score. */
  score: number
  voteScore: number
  metric1Score: number
  metric2Score: number
  position: Position
  votingPhasePoints: number
}

export interface Topic {
  id: number
  pack: Pack
  type: TopicType
  description: string
  descriptionIs: string
  optionA: string
  optionB: string
  optionAIs: string
  optionBIs: string
  seriousness: number
}

export interface Corruption {
  id: number
  type: CorruptionType
  points: number
  title: string
  titleIs: string
  description: string
  descriptionIs: string
  shortDescription: string
  shortDescriptionIs: string
  requiresTeammate: boolean
  /** Betrayal that requires the player's group to receive zero vote points. */
  requiresZeroGroupVotes: boolean
}

export const METRICS: Metric[] = ['Comedy', 'Creativity', 'OnTopic', 'Factual', 'Enthusiasm']
