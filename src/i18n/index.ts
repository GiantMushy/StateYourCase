// Localization. `gametext.json` is the Unity "GametextReal" string table exported verbatim;
// `CODE_STRINGS` holds the bilingual strings the Unity controllers built in C#.
import { useGame } from '../game/store'
import type { Language } from '../game/types'
import gametext from './gametext.json'

type Entry = { en: string; is: string }

const CODE_STRINGS = {
  IAmPrefix: { en: 'I am ', is: 'Ég er ' },
  WeArePrefix: { en: 'We are ', is: 'Við erum ' },
  Civilian: { en: 'Civilian', is: 'Borgari' },
  CivilianText: { en: 'You have no corruption. Debate honestly!', is: 'Þú hefur enga spillingu. Rökræddu heiðarlega!' },
  SpeechType: { en: 'Speech', is: 'Ræða' },
  InterruptionType: { en: 'Interruption', is: 'Frammíkall' },
  BetrayalType: { en: 'Betrayal', is: 'Svik' },
  StolenPoints: { en: 'Stolen Points', is: 'Stolin stig' },
  AccuserSelected: { en: 'Click on the player that {0} is accusing!', is: 'Smelltu á leikmanninn sem {0} er að ásaka!' },
  TargetSelected: { en: '{0} is accusing {1}!\nWas the guess correct?', is: '{0} ásakar {1}!\nVar ágiskunin rétt?' },
  DiscussionModerator: { en: 'Discussion Moderator', is: 'Discussion Moderator' },
  GroupN: { en: 'Group {0}', is: 'Hópur {0}' },
  For: { en: 'For', is: 'For' },
  Against: { en: 'Against', is: 'Against' },
  NoTopic: { en: 'No topic available', is: 'No topic available' },
  // Settings (not in Unity).
  Setting_metrics: { en: 'Metrics', is: 'Mælikvarðar' },
  Setting_secret_obj: { en: 'Secret Obj', is: 'Leyniverk' },
  Setting_dm_shuffle: { en: 'DM Shuffle', is: 'DM Stokkun' },
  Settings_locked: { en: 'Locked until the game ends', is: 'Læst þar til leiknum lýkur' },
  Settings_dm_shuffle_teams: { en: 'DM Shuffle needs every team to be one player', is: 'DM Stokkun krefst eins leikmanns í hverju liði' },
  DM_all_groups_done: { en: 'Every group has made its case', is: 'Allir hópar hafa flutt mál sitt' },
  DM_shuffle_drop_error: { en: 'DM Shuffle is on: teams can only have one player', is: 'DM Stokkun er á: aðeins einn leikmaður í hverju liði' },
} satisfies Record<string, Entry>

const TABLE: Record<string, Entry> = { ...(gametext as Record<string, Entry>), ...CODE_STRINGS }

export type StringKey = keyof typeof CODE_STRINGS | keyof typeof gametext

export function translate(lang: Language, key: StringKey, ...args: (string | number)[]): string {
  const entry = TABLE[key]
  let s = entry ? entry[lang] || entry.en : String(key)
  args.forEach((a, i) => (s = s.replace(`{${i}}`, String(a))))
  return s
}

export function useLang(): Language {
  return useGame((s) => s.language)
}

export function useT() {
  const lang = useLang()
  return (key: StringKey, ...args: (string | number)[]) => translate(lang, key, ...args)
}

/** Picks the language-specific value (e.g. a header sprite or a CSV column). */
export function useLocalized<T>(en: T, is: T): T {
  return useLang() === 'is' ? is : en
}
