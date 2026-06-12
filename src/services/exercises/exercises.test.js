import { describe, it, expect } from 'vitest'
import {
  filterExercises,
  filterAllExercises,
  getCombinedFilterOptions
} from './index'

const customExercises = [
  {
    id: 'c1',
    name: "Kevin's Shoulder Warmup",
    source: 'custom',
    bodyPart: 'shoulders',
    targetMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: null,
    instructions: []
  },
  {
    id: 'c2',
    name: 'Machine Chest Press (Old Gym)',
    source: 'custom',
    bodyPart: null,
    targetMuscles: ['custom-pec'],
    secondaryMuscles: [],
    equipment: 'old-machine',
    instructions: []
  }
]

describe('filterAllExercises', () => {
  it('matches custom exercises by name (case-insensitive substring)', () => {
    const results = filterAllExercises({ query: 'shoulder warmup' }, customExercises)
    expect(results.some((e) => e.id === 'c1')).toBe(true)
  })

  it('merges built-in + custom and sorts by name', () => {
    const all = filterAllExercises({}, customExercises)
    const builtinOnly = filterExercises({})
    expect(all.length).toBe(builtinOnly.length + customExercises.length)
    const names = all.map((e) => e.name)
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
  })

  it('includes a custom exercise under a matching body-part filter', () => {
    const results = filterAllExercises({ bodyPart: 'shoulders' }, customExercises)
    expect(results.some((e) => e.id === 'c1')).toBe(true)
  })

  it('excludes custom exercises lacking metadata when a metadata filter is active', () => {
    // c2 has bodyPart null → excluded by a body-part filter.
    const results = filterAllExercises({ bodyPart: 'chest' }, customExercises)
    expect(results.some((e) => e.id === 'c2')).toBe(false)
  })

  it('falls back to built-in-only behavior with no custom list', () => {
    expect(filterAllExercises({})).toBe(filterExercises({}))
  })
})

describe('getCombinedFilterOptions', () => {
  it('adds custom values to the filter dropdowns', () => {
    const options = getCombinedFilterOptions(customExercises)
    expect(options.muscles).toContain('custom-pec')
    expect(options.equipment).toContain('old-machine')
    expect(options.bodyParts).toContain('shoulders')
  })

  it('returns the cached built-in options when no custom exercises', () => {
    const options = getCombinedFilterOptions([])
    expect(options.muscles).not.toContain('custom-pec')
  })
})
