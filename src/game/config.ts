// Tunables copied from the Unity scene's Inspector values (not the C# defaults).

export const CONFIG = {
  totalRounds: 3,
  winScoreThreshold: 500,
  minPlayers: 3,
  maxPlayers: 8,
  maxNameLength: 12,
  startingShuffles: 3,
  seriousness: 2,

  // VotingController
  finalPlacePoints: [100, 75, 50],
  localVotePoints: [3, 2, 1],
  metricPoints: 35,

  // AccusationController
  incorrectPenalty: 20,

  // DMDisplayController
  timerDuration: 60,
} as const
