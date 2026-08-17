import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/activeWorkout', () => ({
  readActiveWorkout: vi.fn(),
  writeActiveWorkout: vi.fn(),
  clearActiveWorkout: vi.fn()
}))

import {
  readActiveWorkout,
  writeActiveWorkout,
  clearActiveWorkout
} from '../../utils/activeWorkout'
import {
  isActiveWorkoutForRoutine,
  resolveActiveWorkoutForRoutine
} from './resolveActiveWorkout'

function liveSession(overrides = {}) {
  return {
    id: 'sess-1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    startedAt: 1000,
    completedAt: null,
    status: 'in_progress',
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        notes: '',
        supersetId: null,
        sets: [{ reps: 8, weight: 185, unit: 'lb', completed: true, timestamp: 1500 }]
      }
    ],
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  readActiveWorkout.mockReturnValue(null)
})

describe('isActiveWorkoutForRoutine', () => {
  it('accepts an in-progress session belonging to the routine', () => {
    expect(isActiveWorkoutForRoutine(liveSession(), 'routine-1')).toBe(true)
  })

  it('rejects a session belonging to a different routine', () => {
    expect(isActiveWorkoutForRoutine(liveSession(), 'routine-2')).toBe(false)
  })

  it('rejects a completed session', () => {
    expect(
      isActiveWorkoutForRoutine(
        liveSession({ status: 'completed', completedAt: 2000 }),
        'routine-1'
      )
    ).toBe(false)
  })

  it('rejects malformed or absent data', () => {
    expect(isActiveWorkoutForRoutine(null, 'routine-1')).toBe(false)
    expect(isActiveWorkoutForRoutine(undefined, 'routine-1')).toBe(false)
    expect(isActiveWorkoutForRoutine({}, 'routine-1')).toBe(false)
    expect(isActiveWorkoutForRoutine(liveSession({ id: undefined }), 'routine-1')).toBe(false)
    expect(isActiveWorkoutForRoutine(liveSession({ routineId: undefined }), 'routine-1')).toBe(false)
  })

  it('rejects a lookup with no routine id', () => {
    expect(isActiveWorkoutForRoutine(liveSession(), undefined)).toBe(false)
    expect(isActiveWorkoutForRoutine(liveSession(), '')).toBe(false)
  })
})

describe('resolveActiveWorkoutForRoutine', () => {
  it('returns the matching session untouched', () => {
    const saved = liveSession()
    readActiveWorkout.mockReturnValue(saved)

    const resolved = resolveActiveWorkoutForRoutine('routine-1')

    expect(resolved).toBe(saved)
    expect(resolved.id).toBe('sess-1')
    expect(resolved.exercises[0].sets[0]).toEqual({
      reps: 8,
      weight: 185,
      unit: 'lb',
      completed: true,
      timestamp: 1500
    })
  })

  it('returns null when nothing is saved', () => {
    readActiveWorkout.mockReturnValue(null)
    expect(resolveActiveWorkoutForRoutine('routine-1')).toBe(null)
  })

  it('returns null for a workout belonging to another routine', () => {
    readActiveWorkout.mockReturnValue(liveSession({ routineId: 'routine-other' }))
    expect(resolveActiveWorkoutForRoutine('routine-1')).toBe(null)
  })

  it('returns null for unusable saved data', () => {
    readActiveWorkout.mockReturnValue({ garbage: true })
    expect(resolveActiveWorkoutForRoutine('routine-1')).toBe(null)
  })

  it('never writes or clears the recovery copy, on any path', () => {
    for (const saved of [
      liveSession(),
      liveSession({ routineId: 'routine-other' }),
      liveSession({ status: 'completed' }),
      { garbage: true },
      null
    ]) {
      readActiveWorkout.mockReturnValue(saved)
      resolveActiveWorkoutForRoutine('routine-1')
    }

    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })

  it('leaves another routine’s workout in place for that routine to resolve', () => {
    const other = liveSession({ routineId: 'routine-other' })
    readActiveWorkout.mockReturnValue(other)

    expect(resolveActiveWorkoutForRoutine('routine-1')).toBe(null)
    expect(clearActiveWorkout).not.toHaveBeenCalled()
    // Still resolvable by its own routine.
    expect(resolveActiveWorkoutForRoutine('routine-other')).toBe(other)
  })
})
