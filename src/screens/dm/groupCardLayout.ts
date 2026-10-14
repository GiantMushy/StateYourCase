// Layout numbers of the "Debate Time Group Prefab". The card height is the
// VerticalLayoutGroup/ContentSizeFitter result, used like ApplyGroupCardAreaHeight to size
// the masked card area.
export const HEADER_H = 102.7
export const NAME_H = 64.24
export const FIELD_H = 100
/** Content VerticalLayoutGroup: spacing 20, bottom padding 40. */
export const SPACING = 20
export const PAD_BOTTOM = 40

export const groupCardHeight = (playerCount: number) => HEADER_H + NAME_H + playerCount * (SPACING + FIELD_H) + PAD_BOTTOM
