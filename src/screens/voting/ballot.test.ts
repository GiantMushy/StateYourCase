import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { clickCard, createBallot, isComplete, placeInSlot, returnToGrid, type Ballot } from './ballot'

const run = (b: Ballot, fn: (d: Ballot) => void) => produce(b, fn)

describe('group voting ballot', () => {
  it('clicks fill the first free slot and toggle back to the grid', () => {
    let b = createBallot(3, false)
    b = run(b, (d) => clickCard(d, 'g2'))
    b = run(b, (d) => clickCard(d, 'g0'))
    expect(b.slots).toEqual(['g2', 'g0', null])
    b = run(b, (d) => clickCard(d, 'g2'))
    expect(b.slots).toEqual([null, 'g0', null])
    expect(isComplete(b)).toBe(false)
  })

  it('uses two slots when only two groups can be chosen', () => {
    let b = createBallot(2, false)
    b = run(b, (d) => clickCard(d, 'g0'))
    b = run(b, (d) => clickCard(d, 'g1'))
    expect(isComplete(b)).toBe(true)
  })

  it('swaps between slots and displaces to the grid from the grid', () => {
    let b = createBallot(3, false)
    b = run(b, (d) => placeInSlot(d, 'g0', 1))
    b = run(b, (d) => placeInSlot(d, 'g1', 2))
    b = run(b, (d) => placeInSlot(d, 'g0', 2))
    expect(b.slots).toEqual(['g1', 'g0', null])
    b = run(b, (d) => placeInSlot(d, 'g2', 1))
    expect(b.slots).toEqual(['g2', 'g0', null])
  })
})

describe('DM metric ballot', () => {
  it('spawns a clone when an original enters a slot so the group can fill both', () => {
    let b = createBallot(2, true)
    b = run(b, (d) => clickCard(d, 'g1'))
    const clone = b.cards.find((c) => c.isClone)!
    expect(clone.group).toBe(1)
    b = run(b, (d) => clickCard(d, clone.key))
    expect(b.slots.slice(0, 2)).toEqual(['g1', clone.key])
    expect(isComplete(b)).toBe(true)
  })

  it('removes the clone (even from a slot) when the original returns to the grid', () => {
    let b = createBallot(2, true)
    b = run(b, (d) => clickCard(d, 'g1'))
    const clone = b.cards.find((c) => c.isClone)!
    b = run(b, (d) => clickCard(d, clone.key))
    b = run(b, (d) => returnToGrid(d, 'g1'))
    expect(b.slots).toEqual([null, null, null])
    expect(b.cards.some((c) => c.isClone)).toBe(false)
  })

  it('destroys a clone displaced back to the grid', () => {
    let b = createBallot(2, true)
    b = run(b, (d) => clickCard(d, 'g0'))
    const clone = b.cards.find((c) => c.isClone)!
    b = run(b, (d) => placeInSlot(d, clone.key, 2))
    b = run(b, (d) => placeInSlot(d, 'g1', 2))
    expect(b.cards.filter((c) => c.isClone).map((c) => c.group)).toEqual([1])
    expect(b.slots[0]).toBe('g0')
    expect(b.slots[1]).toBe('g1')
  })
})
