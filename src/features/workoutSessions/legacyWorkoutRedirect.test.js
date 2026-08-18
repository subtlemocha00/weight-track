import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocked purely so the "touches nothing" test below can prove no storage or
// Firestore call happens during resolution.
vi.mock('../../utils/activeWorkout', () => ({
  readActiveWorkout: vi.fn(),
  writeActiveWorkout: vi.fn(),
  clearActiveWorkout: vi.fn()
}))
vi.mock('../../services/workoutSessions', () => ({
  startWorkout: vi.fn(),
  saveSession: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  markSessionAbandoned: vi.fn(),
  listCompletedSessions: vi.fn()
}))

import {
  readActiveWorkout,
  writeActiveWorkout,
  clearActiveWorkout
} from '../../utils/activeWorkout'
import * as sessionService from '../../services/workoutSessions'
import { routineWorkoutPath } from './workoutNavigation'
import {
  LEGACY_FALLBACK_PATH,
  resolveLegacyWorkoutDestination
} from './legacyWorkoutRedirect'

function activeSession(overrides = {}) {
  return {
    id: 'sess-1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    status: 'in_progress',
    startedAt: 1000,
    exercises: [],
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('valid active session', () => {
  it('redirects to the canonical route for the session’s routine', () => {
    expect(resolveLegacyWorkoutDestination('sess-1', activeSession())).toBe(
      '/routine/routine-1?workout=1'
    )
  })

  it('builds the destination with the shared path helper', () => {
    expect(resolveLegacyWorkoutDestination('sess-1', activeSession())).toBe(
      routineWorkoutPath('routine-1')
    )
  })

  it('carries the workout flag the routine container looks for', () => {
    const url = new URL(
      resolveLegacyWorkoutDestination('sess-1', activeSession()),
      'https://example.test'
    )
    expect(url.searchParams.get('workout')).toBe('1')
  })
})

describe('session id mismatch', () => {
  it('never redirects to another workout’s routine', () => {
    const other = activeSession({ id: 'sess-other', routineId: 'routine-other' })
    const destination = resolveLegacyWorkoutDestination('sess-1', other)

    expect(destination).toBe(LEGACY_FALLBACK_PATH)
    expect(destination).not.toContain('routine-other')
  })

  it('falls back when the URL has no session id at all', () => {
    expect(resolveLegacyWorkoutDestination(undefined, activeSession())).toBe(
      LEGACY_FALLBACK_PATH
    )
    expect(resolveLegacyWorkoutDestination('', activeSession())).toBe(
      LEGACY_FALLBACK_PATH
    )
  })
})

describe('completed session', () => {
  it('does not reopen a finished workout', () => {
    expect(
      resolveLegacyWorkoutDestination('sess-1', activeSession({ status: 'completed' }))
    ).toBe(LEGACY_FALLBACK_PATH)
  })
})

describe('missing routineId', () => {
  it('does not fabricate a route', () => {
    for (const routineId of [undefined, null, '']) {
      const destination = resolveLegacyWorkoutDestination(
        'sess-1',
        activeSession({ routineId })
      )
      expect(destination).toBe(LEGACY_FALLBACK_PATH)
      expect(destination).not.toContain('undefined')
      expect(destination).not.toContain('null')
    }
  })
})

describe('missing or malformed active workout', () => {
  it('falls back safely', () => {
    for (const saved of [null, undefined, {}, { id: null }, { routineId: 'r1' }]) {
      expect(resolveLegacyWorkoutDestination('sess-1', saved)).toBe(
        LEGACY_FALLBACK_PATH
      )
    }
  })

  it('uses the home screen, the app’s existing recovery surface', () => {
    expect(LEGACY_FALLBACK_PATH).toBe('/home')
  })
})

describe('resolution is inert', () => {
  it('reads and writes nothing — no storage, no Firestore', () => {
    resolveLegacyWorkoutDestination('sess-1', activeSession())
    resolveLegacyWorkoutDestination('sess-1', activeSession({ status: 'completed' }))
    resolveLegacyWorkoutDestination('nope', null)

    expect(readActiveWorkout).not.toHaveBeenCalled()
    expect(writeActiveWorkout).not.toHaveBeenCalled()
    expect(clearActiveWorkout).not.toHaveBeenCalled()
    for (const fn of Object.values(sessionService)) {
      expect(fn).not.toHaveBeenCalled()
    }
  })

  it('does not alter the session it was handed', () => {
    const session = activeSession()
    const before = JSON.stringify(session)

    resolveLegacyWorkoutDestination('sess-1', session)

    expect(JSON.stringify(session)).toBe(before)
  })
})
