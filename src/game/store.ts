// Global game store — the web equivalent of the Unity GameManager singleton. Screen
// components read from it and call its semantic actions; they never set `screen` directly
// except through `setScreen`, mirroring GameManager.SetState.
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { CONFIG } from './config'
import { loadCorruptions, loadTopics } from './database'
import * as M from './model'
import type { GameMode, Language, Metric, Pack, Player, Screen, Topic } from './types'

export interface MutexInfo {
  name: string
  /** 'I am ' or 'We are ' — localized at display time. */
  prefix: 'I am ' | 'We are '
  next: Screen
}

/** Persisted Assign Groups layout (the Unity controller kept its built hierarchy between visits). */
export interface GroupsLayout {
  dmPlayerId: number
  groups: { playerIds: number[]; customName: string }[]
  unassigned: number[]
}

export interface TopicChoice {
  loadedForRound: number
  versus: Topic | null
  scenario: Topic | null
  versusSelected: boolean
  shufflesRemaining: number
}

/** Menu → Settings toggles. Not in Unity; they persist across games. */
export interface Settings {
  metrics: boolean
  secretObjectives: boolean
  dmShuffle: boolean
}
export type SettingKey = keyof Settings

/** True when every team in the layout has at most one player (required for DM Shuffle). */
export const isSoloLayout = (layout: GroupsLayout | null) => !layout || layout.groups.every((g) => g.playerIds.length <= 1)

export interface Transition {
  id: number
  text: string
  action: () => void
}

interface Store {
  screen: Screen
  /** Incremented on every setScreen so re-entering the same screen remounts it (Unity OnEnable). */
  screenVisit: number
  menuOpen: boolean
  /** Screen background tint (Pack Selection lerps it between pack colours). */
  bgColor: string
  language: Language
  gameMode: GameMode
  ownedPacks: Pack[]
  game: M.GameData
  settings: Settings
  /** Settings are locked from leaving Assign Groups until the game is over or a new game starts. */
  settingsLocked: boolean

  nextPlayerId: number
  groupsLayout: GroupsLayout | null
  topicChoice: TopicChoice
  mutex: MutexInfo | null
  corruptionOrder: number[]
  corruptionIndex: number
  votingGroupOrder: number[]
  votingGroupIndex: number
  isDMMetricVoting: boolean
  transition: Transition | null

  setScreen: (s: Screen) => void
  setMenuOpen: (open: boolean) => void
  setBgColor: (color: string) => void
  setLanguage: (l: Language) => void
  setGameMode: (m: GameMode) => void
  /** Returns false when the change is refused (locked, or DM Shuffle with a multi-player team). */
  setSetting: (key: SettingKey, on: boolean) => boolean
  /** Escape hatch for screens that mutate game data directly (always via model.ts helpers). */
  update: (fn: (g: M.GameData) => void) => void

  selectPack: (pack: Pack) => void
  continueAfterPackSelection: () => void
  addPlayer: (name: string) => void
  renamePlayer: (id: number, name: string) => void
  removePlayer: (id: number) => void
  setGroupsLayout: (layout: GroupsLayout | null) => void
  commitGroups: (layout: GroupsLayout, names: string[]) => void
  setTopicChoice: (fn: (t: TopicChoice) => void) => void
  loadTopicsForRound: () => void
  shuffleTopics: () => void
  selectTopic: () => void
  setMetrics: (metrics: Metric[]) => void
  startMutex: (name: string, prefix: MutexInfo['prefix'], next: Screen) => void
  exitMutex: () => void
  startCorruptionSequence: () => void
  advanceCorruptionSequence: () => void
  startVotingSequence: () => void
  submitGroupBallot: (rankedGroupIds: number[]) => void
  submitMetricBallot: (slotGroupIds: number[]) => void
  playTransition: (text: string, action: () => void) => void
  endTransition: () => void
  startNextRound: () => void
  newGame: () => void
}

const emptyTopicChoice = (): TopicChoice => ({
  loadedForRound: -1,
  versus: null,
  scenario: null,
  versusSelected: true,
  shufflesRemaining: CONFIG.startingShuffles,
})

/** The committed groups as an Assign Groups layout (after a DM Shuffle swap), keeping custom names. */
function layoutOf(g: M.GameData, prev: GroupsLayout | null): GroupsLayout {
  return {
    dmPlayerId: M.dmId(g),
    groups: M.groupList(g).map((grp, i) => ({
      playerIds: M.playersInGroup(g, grp.id).map((p) => p.id),
      customName: prev?.groups[i]?.customName ?? '',
    })),
    unassigned: [],
  }
}

let transitionId = 0

export const useGame = create<Store>()(
  immer((set, get) => {
    const dmPlayer = (): Player => {
      const g = get().game
      return g.players[M.dmId(g)]
    }

    const startDMMetricVote = () => {
      set((s) => {
        s.isDMMetricVoting = true
      })
      get().startMutex(dmPlayer().name, 'I am ', 'Voting')
    }

    /** Secret Objectives off: nobody is dealt a corruption. */
    const dealCorruptions = (s: Store) => {
      if (s.settings.secretObjectives) M.assignCorruptionsToPlayers(s.game)
      else M.clearPlayerCorruptions(s.game)
    }

    return {
      screen: 'LocalVsOnline',
      screenVisit: 0,
      menuOpen: false,
      bgColor: '#48CFCBFF',
      language: 'en',
      gameMode: 'Local',
      ownedPacks: ['Default'],
      game: M.createGameData(loadTopics(), loadCorruptions()),
      settings: { metrics: true, secretObjectives: true, dmShuffle: false },
      settingsLocked: false,

      nextPlayerId: 0,
      groupsLayout: null,
      topicChoice: emptyTopicChoice(),
      mutex: null,
      corruptionOrder: [],
      corruptionIndex: 0,
      votingGroupOrder: [],
      votingGroupIndex: 0,
      isDMMetricVoting: false,
      transition: null,

      setScreen: (screen) =>
        set((s) => {
          if (s.menuOpen) return
          s.screen = screen
          s.screenVisit++
          // The final scoreboard ends the game: settings may change again.
          if (screen === 'Scoreboard' && M.isGameOver(s.game)) s.settingsLocked = false
        }),
      setMenuOpen: (open) => set((s) => void (s.menuOpen = open)),
      setBgColor: (bgColor) => set((s) => void (s.bgColor = bgColor)),
      setLanguage: (language) => set((s) => void (s.language = language)),
      setGameMode: (gameMode) => set((s) => void (s.gameMode = gameMode)),
      setSetting: (key, on) => {
        const { settingsLocked, groupsLayout } = get()
        if (settingsLocked) return false
        if (key === 'dmShuffle' && on && !isSoloLayout(groupsLayout)) return false
        set((s) => void (s.settings[key] = on))
        return true
      },
      update: (fn) => set((s) => fn(s.game)),

      selectPack: (pack) =>
        set((s) => {
          s.game.selectedPack = pack
        }),
      continueAfterPackSelection: () =>
        get().setScreen(get().gameMode === 'OnlineHost' ? 'HostOnlineGame' : 'StartLocalGame'),

      addPlayer: (name) =>
        set((s) => {
          M.addPlayer(s.game, s.nextPlayerId, name)
          s.nextPlayerId++
        }),
      renamePlayer: (id, name) =>
        set((s) => {
          if (s.game.players[id]) s.game.players[id].name = name
        }),
      removePlayer: (id) => set((s) => M.removePlayer(s.game, id)),

      setGroupsLayout: (layout) => set((s) => void (s.groupsLayout = layout)),

      /** AssignGroupsController.Next: commit layout, assign corruptions, hand to the DM. */
      commitGroups: (layout, names) => {
        set((s) => {
          const g = s.game
          M.clearAllGroups(g)
          g.dmIdOverride = layout.dmPlayerId
          layout.groups.forEach((grp, i) => {
            const group = M.createGroup(g, names[i])
            for (const pid of grp.playerIds) g.players[pid].groupId = group.id
          })
          s.groupsLayout = layout
          s.settingsLocked = true
          dealCorruptions(s)
        })
        get().startMutex(dmPlayer().name, 'I am ', 'TopicSelection')
      },

      setTopicChoice: (fn) => set((s) => fn(s.topicChoice)),

      /** TopicSelectionController.OnEnable: only reload on a genuinely new round. */
      loadTopicsForRound: () =>
        set((s) => {
          if (s.topicChoice.loadedForRound === s.game.currentRound) return
          s.topicChoice.shufflesRemaining = CONFIG.startingShuffles
          s.topicChoice.versusSelected = true
          s.topicChoice.versus = M.getRandomTopic(s.game, 'Versus', CONFIG.seriousness)
          s.topicChoice.scenario = M.getRandomTopic(s.game, 'Scenarios', CONFIG.seriousness)
          if (s.topicChoice.versus || s.topicChoice.scenario) s.topicChoice.loadedForRound = s.game.currentRound
        }),
      shuffleTopics: () =>
        set((s) => {
          if (s.topicChoice.shufflesRemaining <= 0) return
          s.topicChoice.shufflesRemaining--
          s.topicChoice.versus = M.getRandomTopic(s.game, 'Versus', CONFIG.seriousness)
          s.topicChoice.scenario = M.getRandomTopic(s.game, 'Scenarios', CONFIG.seriousness)
        }),
      selectTopic: () => {
        const t = get().topicChoice
        const topic = t.versusSelected ? t.versus : t.scenario
        if (!topic) return
        set((s) => void (s.game.currentTopic = topic))
        get().setScreen(get().settings.metrics ? 'MetricSelection' : 'AssignPositions')
      },

      setMetrics: (metrics) => set((s) => void (s.game.selectedMetrics = metrics)),

      startMutex: (name, prefix, next) => {
        set((s) => void (s.mutex = { name, prefix, next }))
        get().setScreen('PlayerMutex')
      },
      exitMutex: () => {
        const m = get().mutex
        if (m) get().setScreen(m.next)
      },

      startCorruptionSequence: () => {
        const g = get().game
        // Secret Objectives off: no handout, straight to the DM.
        const order = get().settings.secretObjectives ? M.nonDmPlayers(g).map((p) => p.id) : []
        set((s) => {
          s.corruptionOrder = order
          s.corruptionIndex = 0
        })
        if (order.length) get().startMutex(g.players[order[0]].name, 'I am ', 'CorruptionDisplay')
        else get().startMutex(dmPlayer().name, 'I am ', 'DMDisplay')
      },
      advanceCorruptionSequence: () => {
        set((s) => void s.corruptionIndex++)
        const { corruptionIndex, corruptionOrder, game } = get()
        if (corruptionIndex < corruptionOrder.length)
          get().startMutex(game.players[corruptionOrder[corruptionIndex]].name, 'I am ', 'CorruptionDisplay')
        else get().startMutex(dmPlayer().name, 'I am ', 'DMDisplay')
      },

      startVotingSequence: () => {
        const groups = M.groupList(get().game)
        set((s) => {
          s.votingGroupOrder = groups.map((g) => g.id)
          s.votingGroupIndex = 0
          s.isDMMetricVoting = false
        })
        // Two teams would only vote for each other, so skip straight to the DM's vote
        // (or, with Metrics off, to the scoreboard: there is no vote left to cast).
        if (groups.length <= 2) return get().settings.metrics ? startDMMetricVote() : get().setScreen('Scoreboard')
        get().startMutex(groups[0].name, 'We are ', 'Voting')
      },

      /** VotingController.Next in group mode, then GameManager.AdvanceVotingSequence. */
      submitGroupBallot: (ranked) => {
        set((s) => {
          M.applyGroupBallot(s.game, ranked)
          s.votingGroupIndex++
        })
        const { votingGroupIndex, votingGroupOrder, game } = get()
        if (votingGroupIndex < votingGroupOrder.length) {
          get().startMutex(game.groups[votingGroupOrder[votingGroupIndex]].name, 'We are ', 'Voting')
        } else {
          set((s) => M.finalizeGroupVoting(s.game))
          if (get().settings.metrics) startDMMetricVote()
          else get().setScreen('Scoreboard')
        }
      },
      submitMetricBallot: (slotGroupIds) => {
        set((s) => M.applyMetricBallot(s.game, slotGroupIds))
        get().setScreen('Scoreboard')
      },

      playTransition: (text, action) => set((s) => void (s.transition = { id: ++transitionId, text, action })),
      endTransition: () => set((s) => void (s.transition = null)),

      startNextRound: () => {
        const g = get().game
        if (g.currentRound < CONFIG.totalRounds) {
          set((s) => {
            M.commitRoundScores(s.game)
            s.game.currentRound++
            s.game.selectedMetrics = []
            M.resetAccusations(s.game)
            if (s.settings.dmShuffle) {
              M.swapDm(s.game, M.pickNextDm(s.game))
              s.groupsLayout = layoutOf(s.game, s.groupsLayout)
            }
            dealCorruptions(s)
          })
          // A new DM has to be handed the phone first.
          if (get().settings.dmShuffle) get().startMutex(dmPlayer().name, 'I am ', 'TopicSelection')
          else get().setScreen('TopicSelection')
        } else {
          get().setScreen('Scoreboard')
        }
      },

      newGame: () => {
        set((s) => {
          const g = s.game
          g.selectedMetrics = []
          g.selectedPack = 'Default'
          g.seenTopicIds = []
          g.currentTopic = null
          M.resetCorruptions(g)
          M.resetAllScores(g)
          M.resetAccusations(g)
          M.clearAllGroups(g)
          g.currentRound = 1
          s.groupsLayout = null
          s.topicChoice = emptyTopicChoice()
          s.gameMode = 'Local'
          s.settingsLocked = false
        })
        get().setScreen('PackSelection')
      },
    }
  }),
)

/** Convenience selectors. */
export const selectDm = (s: Store) => s.game.players[M.dmId(s.game)]
