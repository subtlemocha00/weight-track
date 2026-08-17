import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/workoutSessions', () => ({ saveSession: vi.fn() }))
vi.mock('../../services/routines', () => ({
  getRoutine: vi.fn(),
  saveRoutine: vi.fn()
}))
vi.mock('../../utils/activeWorkout', () => ({ clearActiveWorkout: vi.fn() }))

import { saveSession } from '../../services/workoutSessions'
import { getRoutine, saveRoutine } from '../../services/routines'
import { clearActiveWorkout } from '../../utils/activeWorkout'
import {
  applyFinishedSessionToRoutine,
  buildCompletedSession,
  persistFinishedSession
} from './finishWorkout'

function activeSession() {
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
        notes: 'Pause on chest',
        supersetId: 1,
        sets: [
          { reps: 8, weight: 185, unit: 'lb', completed: true, timestamp: 1500 },
          { reps: 6, weight: 195, unit: 'lb', completed: false, timestamp: null }
        ]
      }
    ]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  saveSession.mockResolvedValue(undefined)
  saveRoutine.mockResolvedValue(undefined)
  getRoutine.mockResolvedValue(null)
})

describe('buildCompletedSession', () => {
  it('marks the session completed without touching anything else', () => {
    const before = activeSession()
    const finalized = buildCompletedSession(before, 9000)

    expect(finalized.status).toBe('completed')
    expect(finalized.completedAt).toBe(9000)
    expect(finalized.id).toBe('sess-1')
    expect(finalized.routineId).toBe('routine-1')
    expect(finalized.routineName).toBe('Push Day')
    expect(finalized.startedAt).toBe(1000)
    expect(finalized.exercises).toEqual(before.exercises)
  })

  it('does not mutate the live session', () => {
    const before = activeSession()
    const snapshot = JSON.parse(JSON.stringify(before))
    buildCompletedSession(before, 9000)
    expect(before).toEqual(snapshot)
  })
})

describe('persistFinishedSession — successful save', () => {
  it('writes the completed session once, under its existing id', async () => {
    await persistFinishedSession('uid-1', activeSession(), 9000)

    expect(saveSession).toHaveBeenCalledTimes(1)
    const [uid, written] = saveSession.mock.calls[0]
    expect(uid).toBe('uid-1')
    expect(written.id).toBe('sess-1')
    expect(written.status).toBe('completed')
    expect(written.completedAt).toBe(9000)
    expect(written.exercises[0].sets[0]).toEqual({
      reps: 8,
      weight: 185,
      unit: 'lb',
      completed: true,
      timestamp: 1500
    })
  })

  it('clears the recovery copy only after the write resolves', async () => {
    let clearedDuringWrite = null
    saveSession.mockImplementation(async () => {
      clearedDuringWrite = clearActiveWorkout.mock.calls.length
    })

    await persistFinishedSession('uid-1', activeSession(), 9000)

    expect(clearedDuringWrite).toBe(0)
    expect(clearActiveWorkout).toHaveBeenCalledTimes(1)
    expect(saveSession.mock.invocationCallOrder[0]).toBeLessThan(
      clearActiveWorkout.mock.invocationCallOrder[0]
    )
  })

  it('returns the finalized session for the caller to complete local state with', async () => {
    const finalized = await persistFinishedSession('uid-1', activeSession(), 9000)
    expect(finalized).toMatchObject({ id: 'sess-1', status: 'completed', completedAt: 9000 })
  })

  it('does not touch the routine', async () => {
    await persistFinishedSession('uid-1', activeSession(), 9000)
    expect(getRoutine).not.toHaveBeenCalled()
    expect(saveRoutine).not.toHaveBeenCalled()
  })
})

describe('persistFinishedSession — failed save', () => {
  it('rejects and keeps the recovery copy intact', async () => {
    saveSession.mockRejectedValue(new Error('offline'))

    await expect(
      persistFinishedSession('uid-1', activeSession(), 9000)
    ).rejects.toThrow('offline')

    expect(clearActiveWorkout).not.toHaveBeenCalled()
  })

  it('leaves the caller’s live session object untouched', async () => {
    saveSession.mockRejectedValue(new Error('offline'))
    const live = activeSession()
    const snapshot = JSON.parse(JSON.stringify(live))

    await expect(persistFinishedSession('uid-1', live, 9000)).rejects.toThrow()

    expect(live).toEqual(snapshot)
    expect(live.status).toBe('in_progress')
  })

  it('never updates the routine when the session could not be saved', async () => {
    saveSession.mockRejectedValue(new Error('offline'))
    await expect(persistFinishedSession('uid-1', activeSession(), 9000)).rejects.toThrow()
    expect(getRoutine).not.toHaveBeenCalled()
    expect(saveRoutine).not.toHaveBeenCalled()
  })
})

describe('persistFinishedSession — retry after failure', () => {
  it('succeeds on the second attempt and writes the same document id', async () => {
    const live = activeSession()
    saveSession.mockRejectedValueOnce(new Error('offline'))

    await expect(persistFinishedSession('uid-1', live, 9000)).rejects.toThrow()
    expect(clearActiveWorkout).not.toHaveBeenCalled()

    const finalized = await persistFinishedSession('uid-1', live, 9500)

    expect(saveSession).toHaveBeenCalledTimes(2)
    const ids = saveSession.mock.calls.map(([, written]) => written.id)
    expect(ids).toEqual(['sess-1', 'sess-1'])
    expect(new Set(ids).size).toBe(1)
    expect(finalized.completedAt).toBe(9500)
    expect(clearActiveWorkout).toHaveBeenCalledTimes(1)
  })

  it('retains every logged value across the failed attempt', async () => {
    const live = activeSession()
    saveSession.mockRejectedValueOnce(new Error('offline'))

    await expect(persistFinishedSession('uid-1', live, 9000)).rejects.toThrow()
    await persistFinishedSession('uid-1', live, 9500)

    const [, written] = saveSession.mock.calls[1]
    expect(written.exercises).toEqual(activeSession().exercises)
  })
})

describe('applyFinishedSessionToRoutine', () => {
  it('applies the completed session onto its source routine', async () => {
    getRoutine.mockResolvedValue({
      id: 'routine-1',
      name: 'Push Day',
      exercises: [
        {
          exerciseId: 'bench-press',
          name: 'Bench Press',
          order: 0,
          notes: 'Pause on chest',
          supersetId: null,
          sets: [
            { reps: 5, targetWeight: 135, unit: 'lb', restSeconds: 90 },
            { reps: 5, targetWeight: 135, unit: 'lb', restSeconds: 90 }
          ]
        }
      ]
    })

    const finalized = buildCompletedSession(activeSession(), 9000)
    const applied = await applyFinishedSessionToRoutine('uid-1', finalized)

    expect(applied).toBe(true)
    expect(getRoutine).toHaveBeenCalledWith('uid-1', 'routine-1')
    expect(saveRoutine).toHaveBeenCalledTimes(1)

    const [, updated] = saveRoutine.mock.calls[0]
    // Session values applied; routine-only fields preserved (applySessionToRoutine).
    expect(updated.exercises[0].sets[0]).toMatchObject({
      reps: 8,
      targetWeight: 185,
      unit: 'lb',
      restSeconds: 90
    })
    expect(updated.exercises[0].supersetId).toBe(1)
  })

  it('is a no-op when the source routine no longer exists', async () => {
    getRoutine.mockResolvedValue(null)
    const finalized = buildCompletedSession(activeSession(), 9000)

    await expect(applyFinishedSessionToRoutine('uid-1', finalized)).resolves.toBe(false)
    expect(saveRoutine).not.toHaveBeenCalled()
  })

  it('propagates a routine-write failure without re-saving the session', async () => {
    getRoutine.mockResolvedValue({ id: 'routine-1', name: 'Push Day', exercises: [] })
    saveRoutine.mockRejectedValue(new Error('routine write failed'))
    const finalized = buildCompletedSession(activeSession(), 9000)

    await expect(applyFinishedSessionToRoutine('uid-1', finalized)).rejects.toThrow(
      'routine write failed'
    )
    expect(saveSession).not.toHaveBeenCalled()
  })
})
