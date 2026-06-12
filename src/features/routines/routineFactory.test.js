import { describe, it, expect } from 'vitest'
import { nextCopyName, createRoutineDuplicate } from './routineFactory'

describe('nextCopyName', () => {
  it('appends (Copy) to a plain name', () => {
    expect(nextCopyName('Push Day')).toBe('Push Day (Copy)')
  })

  it('increments a bare (Copy) to (Copy 2)', () => {
    expect(nextCopyName('Push Day (Copy)')).toBe('Push Day (Copy 2)')
  })

  it('increments (Copy N) to (Copy N+1)', () => {
    expect(nextCopyName('Push Day (Copy 2)')).toBe('Push Day (Copy 3)')
    expect(nextCopyName('Push Day (Copy 9)')).toBe('Push Day (Copy 10)')
  })

  it('falls back to "Routine" for an empty/blank name', () => {
    expect(nextCopyName('')).toBe('Routine (Copy)')
    expect(nextCopyName('   ')).toBe('Routine (Copy)')
    expect(nextCopyName(undefined)).toBe('Routine (Copy)')
  })
})

describe('createRoutineDuplicate', () => {
  const source = {
    id: 'orig-1',
    name: 'Push Day',
    createdAt: 1000,
    updatedAt: 2000,
    lastCompleted: 9999,
    exercises: [
      {
        exerciseId: 'ex-1',
        name: 'Bench Press',
        order: 0,
        notes: 'warm up first',
        supersetGroup: null,
        sets: [{ reps: 8, targetWeight: 135, unit: 'lb', restSeconds: 90 }]
      }
    ]
  }

  it('mints a new id and never reuses the original', () => {
    const dup = createRoutineDuplicate(source)
    expect(dup.id).toBeTruthy()
    expect(dup.id).not.toBe(source.id)
  })

  it('renames with the (Copy) convention', () => {
    expect(createRoutineDuplicate(source).name).toBe('Push Day (Copy)')
  })

  it('strips timestamps and completion markers', () => {
    const dup = createRoutineDuplicate(source)
    expect(dup.createdAt).toBeUndefined()
    expect(dup.updatedAt).toBeUndefined()
    expect(dup.lastCompleted).toBeUndefined()
  })

  it('copies exercise/set data intact', () => {
    const dup = createRoutineDuplicate(source)
    expect(dup.exercises).toHaveLength(1)
    expect(dup.exercises[0]).toMatchObject({
      exerciseId: 'ex-1',
      name: 'Bench Press',
      notes: 'warm up first',
      sets: [{ reps: 8, targetWeight: 135, unit: 'lb', restSeconds: 90 }]
    })
  })

  it('is a deep clone with no shared references', () => {
    const dup = createRoutineDuplicate(source)
    dup.exercises[0].sets[0].reps = 99
    dup.exercises[0].name = 'Changed'
    // Mutating the copy must not affect the original.
    expect(source.exercises[0].sets[0].reps).toBe(8)
    expect(source.exercises[0].name).toBe('Bench Press')
  })

  it('tolerates malformed input (missing exercises)', () => {
    const dup = createRoutineDuplicate({ name: 'Bare' })
    expect(dup.exercises).toEqual([])
    expect(dup.name).toBe('Bare (Copy)')
  })
})
