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
// Deliberately not mocked: the navigation target must be the real one, so a
// change to activeWorkoutPath is caught here rather than assumed away.
import { activeWorkoutPath } from './workoutNavigation'
import { createSessionFromRoutine } from './sessionFactory'
import { startActiveWorkout, startWorkoutAndNavigate } from './startActiveWorkout'

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
        notes: '',
        supersetId: null,
        sets: [{ reps: 8, targetWeight: 185, unit: 'lb', restSeconds: 90 }]
      }
    ]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  readActiveWorkout.mockReturnValue(null)
  startWorkout.mockImplementation(async (uid, source) => createSessionFromRoutine(source))
})

describe('startActiveWorkout', () => {
  it('creates the session from the routine it was given', async () => {
    const source = routine()
    const session = await startActiveWorkout('uid-1', source)

    expect(startWorkout).toHaveBeenCalledTimes(1)
    expect(startWorkout).toHaveBeenCalledWith('uid-1', source)
    expect(session.routineId).toBe('routine-1')
    expect(session.status).toBe('in_progress')
  })

  it('makes the returned session the active workout', async () => {
    const session = await startActiveWorkout('uid-1', routine())

    expect(writeActiveWorkout).toHaveBeenCalledTimes(1)
    expect(writeActiveWorkout).toHaveBeenCalledWith(session)
  })

  it('writes the recovery copy only after the session exists', async () => {
    const order = []
    startWorkout.mockImplementation(async (uid, source) => {
      order.push('startWorkout')
      return createSessionFromRoutine(source)
    })
    writeActiveWorkout.mockImplementation(() => order.push('writeActiveWorkout'))

    await startActiveWorkout('uid-1', routine())

    expect(order).toEqual(['startWorkout', 'writeActiveWorkout'])
  })

  it('propagates a failed start without writing anything locally', async () => {
    startWorkout.mockRejectedValue(new Error('offline'))

    await expect(startActiveWorkout('uid-1', routine())).rejects.toThrow('offline')

    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })
})

describe('startWorkoutAndNavigate', () => {
  it('runs start, recovery write and navigation in that exact order', async () => {
    const order = []
    startWorkout.mockImplementation(async (uid, source) => {
      order.push('startWorkout')
      return createSessionFromRoutine(source)
    })
    writeActiveWorkout.mockImplementation(() => order.push('writeActiveWorkout'))
    const navigate = vi.fn(() => order.push('navigate'))

    await startWorkoutAndNavigate({ uid: 'uid-1', routine: routine(), navigate })

    expect(order).toEqual(['startWorkout', 'writeActiveWorkout', 'navigate'])
  })

  // The ordering above could be satisfied by work that merely resolves in that
  // sequence. This pins the real requirement: while the session is still being
  // created, nothing downstream has happened yet.
  it('has neither written nor navigated while the session is still in flight', async () => {
    let releaseStart
    const started = new Promise((resolve) => {
      releaseStart = resolve
    })
    const session = createSessionFromRoutine(routine())
    startWorkout.mockImplementation(() => started.then(() => session))
    const navigate = vi.fn()

    const pending = startWorkoutAndNavigate({
      uid: 'uid-1',
      routine: routine(),
      navigate
    })

    await Promise.resolve()
    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()

    releaseStart()
    await pending

    expect(writeActiveWorkout).toHaveBeenCalledWith(session)
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('navigates to the canonical route for the new session', async () => {
    const navigate = vi.fn()

    const session = await startWorkoutAndNavigate({
      uid: 'uid-1',
      routine: routine(),
      navigate
    })

    expect(navigate).toHaveBeenCalledWith(activeWorkoutPath(session))
    expect(navigate).toHaveBeenCalledWith('/routine/routine-1?workout=1')
  })

  it('navigates forward, adding no navigation options of its own', async () => {
    const navigate = vi.fn()
    await startWorkoutAndNavigate({ uid: 'uid-1', routine: routine(), navigate })

    expect(navigate.mock.calls[0]).toHaveLength(1)
  })

  it('does not navigate when the start fails', async () => {
    startWorkout.mockRejectedValue(new Error('offline'))
    const navigate = vi.fn()

    await expect(
      startWorkoutAndNavigate({ uid: 'uid-1', routine: routine(), navigate })
    ).rejects.toThrow('offline')

    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('returns the session to the caller', async () => {
    const session = await startWorkoutAndNavigate({
      uid: 'uid-1',
      routine: routine(),
      navigate: vi.fn()
    })

    expect(session.routineId).toBe('routine-1')
  })
})
