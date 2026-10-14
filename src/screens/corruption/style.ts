// Per-corruption-type visuals shared by the reveal screen (CorruptionDisplayController) and
// the DM's objective cards (CorruptionCardController). Values are the Inspector/C# ones.
import type { CorruptionType } from '../../game/types'
import type { StringKey } from '../../i18n'

/** GetTextColorForType: dark text on the light cards, light text on the saturated ones. */
export const TEXT_COLOR: Record<CorruptionType, string> = {
  Speech: '#282828FF',
  Civilian: '#282828FF',
  Interruption: '#F5F5F5FF',
  Betrayal: '#F5F5F5FF',
}

/** Card frame sprites (speech/interruption/betrayal/civilian "DisplaySprite" / "Frame"). */
export const CARD_SPRITE: Record<CorruptionType, string> = {
  Speech: 'Spc_container',
  Interruption: 'Int_container',
  Betrayal: 'Bet_container',
  Civilian: 'Civ_container',
}

/** GetLocalizedTypeName (hard-coded bilingual strings in C#). */
export const TYPE_LABEL: Record<CorruptionType, StringKey> = {
  Speech: 'SpeechType',
  Interruption: 'InterruptionType',
  Betrayal: 'BetrayalType',
  Civilian: 'Civilian',
}
