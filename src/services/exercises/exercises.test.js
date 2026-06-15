import { describe, it, expect } from 'vitest'
import {
  filterExercises,
  filterAllExercises,
  getCombinedFilterOptions,
  getAllExercises,
  normalizeExercise,
  isSafeVideoUrl
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

  it('source=custom returns only custom exercises', () => {
    const results = filterAllExercises({ source: 'custom' }, customExercises)
    expect(results.length).toBe(customExercises.length)
    expect(results.every((e) => e.source === 'custom')).toBe(true)
  })

  it('source=builtin excludes all custom exercises', () => {
    const results = filterAllExercises({ source: 'builtin' }, customExercises)
    expect(results.some((e) => e.source === 'custom')).toBe(false)
    expect(results.length).toBe(filterExercises({}).length)
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

describe('normalizeExercise', () => {
  it('defaults a missing videoUrl to null', () => {
    expect(normalizeExercise({ id: 'x', name: 'X' }).videoUrl).toBe(null)
  })

  it('preserves an existing videoUrl and all other fields', () => {
    const ex = { id: 'x', name: 'X', videoUrl: 'https://v', bodyPart: 'chest' }
    expect(normalizeExercise(ex)).toEqual(ex)
  })

  it('every built-in exercise carries a videoUrl property', () => {
    expect(getAllExercises().every((e) => 'videoUrl' in e)).toBe(true)
  })
})

describe('isSafeVideoUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isSafeVideoUrl('https://youtu.be/abc')).toBe(true)
    expect(isSafeVideoUrl('http://example.com/v')).toBe(true)
  })

  it('rejects unsafe schemes, blanks, and non-strings', () => {
    expect(isSafeVideoUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeVideoUrl('not a url')).toBe(false)
    expect(isSafeVideoUrl('')).toBe(false)
    expect(isSafeVideoUrl(null)).toBe(false)
  })
})
