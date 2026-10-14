// Pure layout model of the Assign Groups screen (Unity AssignGroupsController's hierarchy):
// the Discussion Moderator slot, the debate groups, the "ghost" group at the bottom (a drop
// there promotes it to a real group) and the unassigned area. All functions return new boards.
import type { GroupsLayout } from '../../game/store'

export interface GroupBox {
  /** Stable React key (Unity: the container GameObject). */
  key: number
  playerIds: number[]
  /** Text typed into the group-name field ('' → placeholder "Group N" is used). */
  name: string
}

export interface Board {
  /** Player in the DM container, or null when it was dragged out. */
  dm: number | null
  /** Controller's cached `dmId` — EveryoneSolo falls back to it when the DM slot is empty. */
  cachedDm: number
  groups: GroupBox[]
  ghost: { key: number; name: string }
  unassigned: number[]
}

/** `data-drop` ids of the drop targets. */
export type DropId = 'dm' | 'ghost' | 'unassigned' | `g${number}`

let nextKey = 0
const newGhost = () => ({ key: nextKey++, name: '' })
const box = (playerIds: number[], name = ''): GroupBox => ({ key: nextKey++, playerIds, name })

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v)

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** DistributePlayersIntoGroups: round-robin into Clamp(count, 1, n) groups (Mathf.Clamp → 0 when n is 0). */
function distribute(ids: number[], count: number): number[][] {
  const n = ids.length === 0 ? 0 : clamp(count, 1, ids.length)
  const groups: number[][] = Array.from({ length: n }, () => [])
  ids.forEach((id, i) => groups[i % n].push(id))
  return groups
}

function fresh(dm: number, groups: number[][]): Board {
  return { dm, cachedDm: dm, groups: groups.map((ids) => box(ids)), ghost: newGhost(), unassigned: [] }
}

const emptyBoard = (): Board => ({ dm: null, cachedDm: -1, groups: [], ghost: newGhost(), unassigned: [] })

/** BuildScreen (first visit): lowest id is DM, the rest dealt in id order into two groups. */
export function buildBoard(ids: number[]): Board {
  if (!ids.length) return emptyBoard()
  const dm = Math.min(...ids)
  const rest = ids.filter((id) => id !== dm).sort((a, b) => a - b)
  return fresh(dm, distribute(rest, rest.length < 2 ? Math.max(1, rest.length) : 2))
}

/** ShuffleRandomly: random DM, then random pairs; an odd player out makes a trio; never fewer than 2 groups. */
export function shuffleBoard(ids: number[], rng: () => number = Math.random): Board {
  if (!ids.length) return emptyBoard()
  const dm = ids[Math.floor(rng() * ids.length)]
  const rest = shuffled(ids.filter((id) => id !== dm), rng)
  return fresh(dm, distribute(rest, Math.max(2, Math.floor(rest.length / 2))))
}

/** EveryoneSolo: keeps the current DM; every other player (id order) in their own group. */
export function soloBoard(board: Board, ids: number[]): Board {
  if (!ids.length) return emptyBoard()
  const dm = board.dm ?? (ids.includes(board.cachedDm) ? board.cachedDm : Math.min(...ids))
  return fresh(dm, ids.filter((id) => id !== dm).sort((a, b) => a - b).map((id) => [id]))
}

/**
 * RebuildScreenPreservingLayout (later visits): keeps the DM, group membership and custom
 * names; removed players are dropped and new players land in the unassigned area. Like
 * Unity, the group count is re-clamped to [2, players − 1] and emptied groups are deleted.
 */
export function rebuildBoard(saved: GroupsLayout, ids: number[]): Board {
  if (!ids.length) return emptyBoard()
  const all = new Set(ids)
  const dm = all.has(saved.dmPlayerId) ? saved.dmPlayerId : Math.min(...ids)
  const placed = new Set([dm])
  const nonDm = ids.length - 1
  const count = nonDm < 2 ? Math.max(1, nonDm) : clamp(saved.groups.length, 2, nonDm)

  const groups: GroupBox[] = []
  for (let g = 1; g <= count; g++) {
    const prev = saved.groups[g - 1]
    const name = prev?.customName.trim() ?? ''
    // Restores the custom name only when it differs from both default labels.
    const keep = name !== '' && name !== `Group ${g}` && name !== `Hópur ${g}`
    const members = (prev?.playerIds ?? []).filter((id) => all.has(id) && !placed.has(id))
    members.forEach((id) => placed.add(id))
    groups.push(box(members, keep ? name : ''))
  }

  const unassigned: number[] = []
  for (const id of [...saved.unassigned, ...[...ids].sort((a, b) => a - b)]) {
    if (all.has(id) && !placed.has(id)) {
      placed.add(id)
      unassigned.push(id)
    }
  }

  return { dm, cachedDm: dm, groups: groups.filter((g) => g.playerIds.length > 0), ghost: newGhost(), unassigned }
}

type Origin = { kind: 'dm' } | { kind: 'group'; index: number; at: number } | { kind: 'unassigned'; at: number }

function locate(b: Board, pid: number): Origin | null {
  if (b.dm === pid) return { kind: 'dm' }
  const u = b.unassigned.indexOf(pid)
  if (u >= 0) return { kind: 'unassigned', at: u }
  for (let index = 0; index < b.groups.length; index++) {
    const at = b.groups[index].playerIds.indexOf(pid)
    if (at >= 0) return { kind: 'group', index, at }
  }
  return null
}

const originId = (b: Board, o: Origin): DropId =>
  o.kind === 'dm' ? 'dm' : o.kind === 'unassigned' ? 'unassigned' : `g${b.groups[o.index].key}`

/**
 * OnCardDrop. A null target (dropped outside every container) returns the card to its origin.
 * Dropping on the occupied DM slot swaps: the old DM takes the dragged card's place.
 * A debate group left empty by the move is deleted (the others renumber).
 */
export function dropCard(b: Board, pid: number, target: DropId | null): Board {
  const origin = locate(b, pid)
  if (!origin || !target || target === originId(b, origin)) return b

  let dm = b.dm
  let ghost = b.ghost
  let groups = b.groups.map((g) => ({ ...g, playerIds: [...g.playerIds] }))
  const unassigned = [...b.unassigned]
  const originGroup = origin.kind === 'group' ? groups[origin.index] : null

  // Lift the card out of its origin.
  if (origin.kind === 'dm') dm = null
  else if (origin.kind === 'unassigned') unassigned.splice(origin.at, 1)
  else originGroup!.playerIds.splice(origin.at, 1)

  if (target === 'unassigned') {
    unassigned.push(pid)
  } else if (target === 'ghost') {
    // Promote the ghost to a real group and spawn a new ghost below it.
    groups.push({ key: ghost.key, name: ghost.name, playerIds: [pid] })
    ghost = newGhost()
  } else if (target === 'dm') {
    if (dm !== null) {
      const displaced = dm
      if (origin.kind === 'unassigned') unassigned.splice(origin.at, 0, displaced)
      else if (origin.kind === 'group') originGroup!.playerIds.splice(origin.at, 0, displaced)
    }
    dm = pid
  } else {
    groups.find((g) => `g${g.key}` === target)?.playerIds.push(pid)
  }

  // TryAutoDeleteIfEmpty(originalParent)
  if (originGroup && originGroup.playerIds.length === 0) groups = groups.filter((g) => g !== originGroup)

  return { ...b, dm, ghost, groups, unassigned }
}

/** The name a group is committed with: typed text, else its "Group N" placeholder. */
export const effectiveName = (g: GroupBox, label: string) => g.name.trim() || label

/** CheckForDuplicateGroupNames (case-insensitive, on effective names). */
export function hasDuplicateNames(b: Board, label: (n: number) => string) {
  const names = b.groups.map((g, i) => effectiveName(g, label(i + 1)).toLowerCase())
  return new Set(names).size !== names.length
}

/** IsLayoutValid: DM set, ≥ 2 groups, none empty, nobody unassigned. */
export const isLayoutValid = (b: Board) =>
  b.dm !== null && b.groups.length >= 2 && b.unassigned.length === 0 && b.groups.every((g) => g.playerIds.length > 0)

export const toLayout = (b: Board): GroupsLayout => ({
  dmPlayerId: b.dm ?? -1,
  groups: b.groups.map((g) => ({ playerIds: [...g.playerIds], customName: g.name })),
  unassigned: [...b.unassigned],
})
