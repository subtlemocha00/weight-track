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
import { resolveActiveWorkoutForRoutine } from '../workoutSessions/resolveActiveWorkout'
import { resolveWorkoutControl } from './resolveWorkoutControl'

function liveSession(overrides = {}) {
  return {
    id: 'sess-abc',
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

// Exactly how RoutineWorkoutContainer wires the two: the resolver decides
// ownership, the control decides what the editor offers.
function controlFor(routineId, { saved = null, workoutActionsAvailable = true } = {}) {
  readActiveWorkout.mockReturnValue(saved)
  return resolveWorkoutControl({
    workoutActionsAvailable,
    ownsActiveWorkout: Boolean(resolveActiveWorkoutForRoutine(routineId))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  readActiveWorkout.mockReturnValue(null)
})

describe('resolveWorkoutControl', () => {
  it('offers Start when there is no active workout', () => {
    expect(controlFor('routine-1')).toBe('start')
  })

  it('offers Resume when this routine owns the active workout', () => {
    expect(controlFor('routine-1', { saved: liveSession() })).toBe('resume')
  })

  it('offers Start, never Resume, when another routine owns the workout', () => {
    // The editor's own active-workout gate is what disables this Start. What
    // matters here is that routine-2 is never given a way into routine-1's
    // workout.
    expect(controlFor('routine-2', { saved: liveSession() })).toBe('start')
  })

  it('does not offer Resume for a completed session', () => {
    const done = liveSession({ status: 'completed', completedAt: 2000 })
    expect(controlFor('routine-1', { saved: done })).toBe('start')
  })

  it('does not offer Resume for malformed recovery data', () => {
    for (const saved of [
      {},
      { garbage: true },
      liveSession({ id: undefined }),
      liveSession({ routineId: undefined }),
      liveSession({ routineId: null })
    ]) {
      expect(controlFor('routine-1', { saved })).toBe('start')
    }
  })

  it('offers nothing for a routine that cannot run a workout yet', () => {
    // The new-routine page passes no workout handler: no Start, and no Resume
    // even if some other workout happens to be live.
    expect(controlFor('routine-1', { workoutActionsAvailable: false })).toBe('none')
    expect(
      controlFor('routine-1', { saved: liveSession(), workoutActionsAvailable: false })
    ).toBe('none')
  })

  it('resumes into the stored session itself, not a copy or a new one', () => {
    const saved = liveSession()
    readActiveWorkout.mockReturnValue(saved)

    const resumed = resolveActiveWorkoutForRoutine('routine-1')

    // Same object: no id is generated and nothing is rebuilt from the routine.
    expect(resumed).toBe(saved)
    expect(resumed.id).toBe('sess-abc')
    expect(resumed.routineId).toBe('routine-1')
    expect(resumed.startedAt).toBe(1000)
    expect(resumed.exercises[0].sets[0]).toEqual({
      reps: 8,
      weight: 185,
      unit: 'lb',
      completed: true,
      timestamp: 1500
    })
  })

  it('decides resumability without writing or clearing the recovery copy', () => {
    for (const saved of [
      liveSession(),
      liveSession({ routineId: 'routine-other' }),
      liveSession({ status: 'completed' }),
      { garbage: true },
      null
    ]) {
      controlFor('routine-1', { saved })
    }

    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })
})
