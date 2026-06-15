import { describe, it, expect } from 'vitest'
import {
  assignSuperset,
  normalizeSupersets,
  getSupersetCount,
  supersetLetter,
  supersetLabel,
  supersetColor
} from './supersets'

const ex = (supersetId = null) => ({ supersetId })
const ids = (list) => list.map((e) => e.supersetId)

describe('supersetLetter / supersetLabel', () => {
  it('maps ids to letters starting at A', () => {
    expect(supersetLetter(1)).toBe('A')
    expect(supersetLetter(2)).toBe('B')
    expect(supersetLetter(26)).toBe('Z')
    expect(supersetLetter(27)).toBe('AA')
  })

  it('returns empty for "no superset"', () => {
    expect(supersetLetter(null)).toBe('')
    expect(supersetLetter(0)).toBe('')
    expect(supersetLabel(null)).toBe('')
    expect(supersetLabel(1)).toBe('Superset A')
  })
})

describe('supersetColor', () => {
  it('returns null for no superset and cycles when exhausted', () => {
    expect(supersetColor(null)).toBeNull()
    expect(supersetColor(1)).toBe(supersetColor(6)) // 5-color palette wraps
    expect(supersetColor(1)).not.toBe(supersetColor(2))
  })
})

describe('assignSuperset', () => {
  it('assigns a slot to an exercise', () => {
    const out = assignSuperset([ex(), ex()], 0, 1)
    expect(ids(out)).toEqual([1, null])
  })

  it('toggles the assignment off when the same slot is clicked again', () => {
    const out = assignSuperset([ex(1), ex()], 0, 1)
    expect(ids(out)).toEqual([null, null])
  })

  it('reassigns to a different slot (latest wins)', () => {
    // ex0=A, ex1=B; click A on ex1 → ex1 moves B→A, B becomes empty → collapses
    const start = [ex(1), ex(2)]
    const out = assignSuperset(start, 1, 1)
    expect(ids(out)).toEqual([1, 1])
  })

  it('renumbers sequentially when a middle superset empties', () => {
    // A,B,C single-member each; remove B → C renumbers to B
    const start = [ex(1), ex(2), ex(3)]
    const out = assignSuperset(start, 1, 2) // toggle B off on ex1
    expect(ids(out)).toEqual([1, null, 2])
  })

  it('allows single-exercise supersets', () => {
    const out = assignSuperset([ex(), ex()], 0, 1)
    expect(getSupersetCount(out)).toBe(1)
  })
})

describe('normalizeSupersets', () => {
  it('closes gaps by mapping distinct ids ascending to 1..n', () => {
    const out = normalizeSupersets([ex(2), ex(3), ex(2)])
    expect(ids(out)).toEqual([1, 2, 1])
  })

  it('is a no-op (same reference) for already-sequential input', () => {
    const input = [ex(1), ex(2), ex(1)]
    expect(normalizeSupersets(input)).toBe(input)
  })

  it('clears invalid ids to null', () => {
    const out = normalizeSupersets([ex(0), ex(-1), ex('x')])
    expect(ids(out)).toEqual([null, null, null])
  })
})

describe('getSupersetCount', () => {
  it('counts distinct supersets', () => {
    expect(getSupersetCount([ex(1), ex(1), ex(2), ex()])).toBe(2)
    expect(getSupersetCount([])).toBe(0)
  })
})
