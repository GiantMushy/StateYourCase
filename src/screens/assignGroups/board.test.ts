import { describe, expect, it } from 'vitest'
import { buildBoard, shuffleSoloBoard, soloBoard, wouldMakeTeam } from './board'

describe('DM Shuffle board guard', () => {
  it('refuses drops into an occupied team only', () => {
    const b = soloBoard(buildBoard([0, 1, 2, 3]), [0, 1, 2, 3])
    const [g1, g2] = b.groups
    expect(wouldMakeTeam(b, g1.playerIds[0], `g${g2.key}`)).toBe(true)
    expect(wouldMakeTeam(b, g1.playerIds[0], `g${g1.key}`)).toBe(false)
    expect(wouldMakeTeam(b, g1.playerIds[0], 'ghost')).toBe(false)
    expect(wouldMakeTeam(b, g1.playerIds[0], 'dm')).toBe(false)
    expect(wouldMakeTeam(b, g1.playerIds[0], null)).toBe(false)
  })

  it('solo shuffle gives everyone but the DM their own team', () => {
    const b = shuffleSoloBoard([0, 1, 2, 3, 4])
    expect(b.groups).toHaveLength(4)
    expect(b.groups.every((g) => g.playerIds.length === 1)).toBe(true)
    expect(new Set([b.dm, ...b.groups.flatMap((g) => g.playerIds)]).size).toBe(5)
  })
})
