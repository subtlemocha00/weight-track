import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/workoutSessions', () => ({ startWorkout: vi.fn() }))
vi.mock('../../utils/activeWorkout', () => ({
  readActiveWorkout: vi.fn(),
  writeActiveWorkout: vi.fn(),
  clearActiveWorkout: vi.fn()
}))

import { startWorkout } from '../../services/workoutSessions'
import {
  readActiveWorkout,
  writeActiveWorkout,
  clearActiveWorkout
} from '../../utils/activeWorkout'
import { createSessionFromRoutine } from './sessionFactory'
import { isActiveWorkoutForRoutine } from './resolveActiveWorkout'
import { hasActiveWorkout, startRoutineWorkout } from './startRoutineWorkout'

function routine() {
  return {
    id: 'routine-1',
    name: 'Push Day',
    createdAt: 500,
    updatedAt: 900,
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        notes: 'Pause on chest',
        supersetId: 1,
        sets: [
          { reps: 8, targetWeight: 185, unit: 'lb', restSeconds: 90 },
          { reps: 8, targetWeight: 185, unit: 'lb', restSeconds: 90 }
        ]
      }
    ]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  readActiveWorkout.mockReturnValue(null)
  // Produce a real session so shape assertions are meaningful; startWorkout's
  // own snapshot behaviour is unchanged by this phase.
  startWorkout.mockImplementation(async (uid, source) => createSessionFromRoutine(source))
})

describe('hasActiveWorkout', () => {
  it('reports whether a recovery copy exists', () => {
    readActiveWorkout.mockReturnValue(null)
    expect(hasActiveWorkout()).toBe(false)

    readActiveWorkout.mockReturnValue({ id: 'sess-1', routineId: 'routine-9' })
    expect(hasActiveWorkout()).toBe(true)
  })
})

describe('startRoutineWorkout — no workout in progress', () => {
  it('starts exactly one workout from the routine it was given', async () => {
    const source = routine()
    const session = await startRoutineWorkout('uid-1', source)

    expect(startWorkout).toHaveBeenCalledTimes(1)
    expect(startWorkout).toHaveBeenCalledWith('uid-1', source)
    expect(session.routineId).toBe('routine-1')
    expect(session.routineName).toBe('Push Day')
    expect(session.status).toBe('in_progress')
    expect(session.id).toBeTruthy()
    expect(session.exercises).toHaveLength(1)
    expect(session.exercises[0].sets).toHaveLength(2)
  })

  it('writes the recovery copy, and only after the session exists', async () => {
    let writesDuringStart = null
    startWorkout.mockImplementation(async (uid, source) => {
      writesDuringStart = writeActiveWorkout.mock.calls.length
      return createSessionFromRoutine(source)
    })

    const session = await startRoutineWorkout('uid-1', routine())

    expect(writesDuringStart).toBe(0)
    expect(writeActiveWorkout).toHaveBeenCalledTimes(1)
    expect(writeActiveWorkout).toHaveBeenCalledWith(session)
    expect(startWorkout.mock.invocationCallOrder[0]).toBeLessThan(
      writeActiveWorkout.mock.invocationCallOrder[0]
    )
  })

  it('produces a session the routine container can resolve (Phase D contract)', async () => {
    const source = routine()
    await startRoutineWorkout('uid-1', source)

    const [written] = writeActiveWorkout.mock.calls[0]
    expect(isActiveWorkoutForRoutine(written, source.id)).toBe(true)
    expect(isActiveWorkoutForRoutine(written, 'some-other-routine')).toBe(false)
  })

  it('never clears anything', async () => {
    await startRoutineWorkout('uid-1', routine())
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })
})

describe('startRoutineWorkout — a workout is already in progress', () => {
  beforeEach(() => {
    readActiveWorkout.mockReturnValue({
      id: 'sess-existing',
      routineId: 'routine-other',
      status: 'in_progress'
    })
  })

  it('refuses to start a second workout', async () => {
    await expect(startRoutineWorkout('uid-1', routine())).resolves.toBe(null)
    expect(startWorkout).not.toHaveBeenCalled()
  })

  it('leaves the existing recovery copy untouched', async () => {
    await startRoutineWorkout('uid-1', routine())
    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })

  it('refuses even for the routine that owns the active workout', async () => {
    readActiveWorkout.mockReturnValue({
      id: 'sess-existing',
      routineId: 'routine-1',
      status: 'in_progress'
    })

    await expect(startRoutineWorkout('uid-1', routine())).resolves.toBe(null)
    expect(startWorkout).not.toHaveBeenCalled()
    expect(writeActiveWorkout).not.toHaveBeenCalled()
  })
})

describe('startRoutineWorkout — failure', () => {
  it('propagates the error without writing a recovery copy', async () => {
    startWorkout.mockRejectedValue(new Error('offline'))

    await expect(startRoutineWorkout('uid-1', routine())).rejects.toThrow('offline')

    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })
})
