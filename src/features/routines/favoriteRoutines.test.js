import { describe, expect, it } from 'vitest'
import { isFavorite, orderRoutinesByFavorite } from './favoriteRoutines'

// The list as it arrives from listRoutines: already ordered by last edit,
// newest first. The dates are the ones from the worked example.
function routines(favoriteIds = []) {
  return [
    { id: 'A', name: 'Routine A', updatedAt: Date.parse('2026-08-19') },
    { id: 'B', name: 'Routine B', updatedAt: Date.parse('2026-08-18') },
    { id: 'C', name: 'Routine C', updatedAt: Date.parse('2026-08-17') },
    { id: 'D', name: 'Routine D', updatedAt: Date.parse('2026-08-16') }
  ].map((routine) => ({ ...routine, favorite: favoriteIds.includes(routine.id) }))
}

const ids = (list) => list.map((routine) => routine.id)

describe('isFavorite', () => {
  it('is true only for a real boolean true', () => {
    expect(isFavorite({ favorite: true })).toBe(true)
    expect(isFavorite({ favorite: false })).toBe(false)
  })

  it('treats a routine saved before favourites existed as not favourite', () => {
    expect(isFavorite({ id: 'legacy', name: 'Old' })).toBe(false)
    expect(isFavorite({ favorite: undefined })).toBe(false)
  })

  it('treats malformed values as not favourite rather than guessing', () => {
    expect(isFavorite({ favorite: 'true' })).toBe(false)
    expect(isFavorite({ favorite: 1 })).toBe(false)
    expect(isFavorite({ favorite: {} })).toBe(false)
    expect(isFavorite({ favorite: null })).toBe(false)
  })

  it('survives a missing routine', () => {
    expect(isFavorite(null)).toBe(false)
    expect(isFavorite(undefined)).toBe(false)
  })
})

describe('orderRoutinesByFavorite', () => {
  it('leaves the last-edit ordering untouched when nothing is favourited', () => {
    expect(ids(orderRoutinesByFavorite(routines()))).toEqual(['A', 'B', 'C', 'D'])
  })

  it('lifts a single favourite above the non-favourites', () => {
    expect(ids(orderRoutinesByFavorite(routines(['C'])))).toEqual([
      'C',
      'A',
      'B',
      'D'
    ])
  })

  it('keeps several favourites in their last-edit order', () => {
    // C is edited more recently than D, so it stays ahead of it — the group
    // moves up as a block without being reordered.
    expect(ids(orderRoutinesByFavorite(routines(['C', 'D'])))).toEqual([
      'C',
      'D',
      'A',
      'B'
    ])
  })

  it('keeps the non-favourites in their last-edit order', () => {
    // A is edited more recently than B and stays ahead of it, even though both
    // have been pushed below the favourites.
    expect(ids(orderRoutinesByFavorite(routines(['C', 'D'])).slice(2))).toEqual([
      'A',
      'B'
    ])
  })

  it('orders favourites by last edit, not by when they were favourited', () => {
    // A is starred last but is the most recently edited, so it goes to the top
    // of the favourite group rather than the bottom.
    expect(ids(orderRoutinesByFavorite(routines(['C', 'D', 'A'])))).toEqual([
      'A',
      'C',
      'D',
      'B'
    ])
  })

  it('returns an unfavourited routine to its place among the non-favourites', () => {
    const starred = orderRoutinesByFavorite(routines(['C', 'D', 'A']))
    expect(ids(starred)).toEqual(['A', 'C', 'D', 'B'])

    // Unstar A: it belongs above B on last edit, and below the remaining
    // favourites regardless of how recently it was edited.
    const unstarred = orderRoutinesByFavorite(routines(['C', 'D']))
    expect(ids(unstarred)).toEqual(['C', 'D', 'A', 'B'])
  })

  it('groups routines that predate the property alongside explicit ones', () => {
    const mixed = [
      { id: 'legacy-new', updatedAt: 4 },
      { id: 'starred', updatedAt: 3, favorite: true },
      { id: 'malformed', updatedAt: 2, favorite: 'true' },
      { id: 'plain', updatedAt: 1, favorite: false }
    ]
    expect(ids(orderRoutinesByFavorite(mixed))).toEqual([
      'starred',
      'legacy-new',
      'malformed',
      'plain'
    ])
  })

  it('does not change the timestamps it orders by', () => {
    const input = routines(['C'])
    const before = input.map((routine) => routine.updatedAt)
    orderRoutinesByFavorite(input)
    expect(input.map((routine) => routine.updatedAt)).toEqual(before)
    expect(ids(input)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns the same routine objects rather than copies', () => {
    const input = routines(['C'])
    expect(orderRoutinesByFavorite(input)[0]).toBe(input[2])
  })

  it('tolerates a missing list', () => {
    expect(orderRoutinesByFavorite(null)).toEqual([])
    expect(orderRoutinesByFavorite(undefined)).toEqual([])
    expect(orderRoutinesByFavorite([])).toEqual([])
  })
})
