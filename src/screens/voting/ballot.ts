// Pure slot bookkeeping for the Voting screen — a line-by-line port of VotingController's
// OnGroupClicked / PlaceGroupInSlot / ReturnToGrid / MoveToSlot / MoveToGrid and the DM
// clone logic. Functions mutate an immer draft.

export interface Card {
  /** React key; clones get a fresh key each time they are spawned (Unity Instantiate). */
  key: string
  /** Index into the screen's list of choosable groups (VotingDragHandler.slotIndex). */
  group: number
  isClone: boolean
}

export interface Ballot {
  /** Cards in sibling (draw) order: the originals, then clones in spawn order. */
  cards: Card[]
  /** slotOccupants: card key per vote slot, null = empty. */
  slots: (string | null)[]
  /** DM metric voting allows one group in both slots via clones. */
  dm: boolean
  maxSelections: number
  cloneSeq: number
}

export function createBallot(choiceCount: number, dm: boolean): Ballot {
  return {
    cards: Array.from({ length: choiceCount }, (_, i) => ({ key: `g${i}`, group: i, isClone: false })),
    slots: [null, null, null],
    dm,
    maxSelections: dm || choiceCount <= 2 ? 2 : 3,
    cloneSeq: 0,
  }
}

const cardOf = (b: Ballot, key: string) => b.cards.find((c) => c.key === key)

/** Zero-based slot the card occupies, or -1 when it sits in the grid. */
export const slotOf = (b: Ballot, key: string) => b.slots.indexOf(key)

export const isComplete = (b: Ballot) => b.slots.slice(0, b.maxSelections).every((s) => s !== null)

function firstEmptySlot(b: Ballot) {
  for (let i = 0; i < b.maxSelections; i++) if (b.slots[i] === null) return i
  return -1
}

function spawnClone(b: Ballot, original: Card) {
  if (b.cards.some((c) => c.isClone && c.group === original.group)) return
  b.cards.push({ key: `clone${b.cloneSeq++}`, group: original.group, isClone: true })
}

function destroyClone(b: Ballot, group: number) {
  const clone = b.cards.find((c) => c.isClone && c.group === group)
  if (!clone) return
  b.slots = b.slots.map((s) => (s === clone.key ? null : s))
  b.cards = b.cards.filter((c) => c !== clone)
}

function moveToSlot(b: Ballot, key: string, slot: number) {
  b.slots[slot] = key
  const card = cardOf(b, key)
  if (b.dm && card && !card.isClone) spawnClone(b, card)
}

function moveToGrid(b: Ballot, key: string) {
  b.slots = b.slots.map((s) => (s === key ? null : s))
  const card = cardOf(b, key)
  if (!b.dm || !card) return
  // A clone returning to the grid is destroyed; an original takes its clone with it.
  if (card.isClone) b.cards = b.cards.filter((c) => c !== card)
  else destroyClone(b, card.group)
}

/** Short click: toggle between the grid and the topmost free slot. */
export function clickCard(b: Ballot, key: string) {
  if (slotOf(b, key) >= 0) moveToGrid(b, key)
  else {
    const empty = firstEmptySlot(b)
    if (empty >= 0) moveToSlot(b, key, empty)
  }
}

/**
 * Drop onto a 1-based slot. From another slot the occupant swaps into the vacated slot;
 * from the grid the occupant is displaced back to the grid.
 */
export function placeInSlot(b: Ballot, key: string, slotIndex: number) {
  const idx = slotIndex - 1
  const current = slotOf(b, key)
  const occupant = b.slots[idx]
  if (occupant === key) return
  if (current >= 0) b.slots[current] = null
  if (occupant !== null) {
    if (current >= 0) moveToSlot(b, occupant, current)
    else moveToGrid(b, occupant)
  }
  moveToSlot(b, key, idx)
}

export const returnToGrid = moveToGrid
