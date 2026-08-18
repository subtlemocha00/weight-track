import { describe, expect, it } from 'vitest'
import { isActiveWorkoutForRoutine } from './resolveActiveWorkout'
import {
  WORKOUT_PARAM,
  WORKOUT_PARAM_VALUE,
  activeWorkoutPath,
  routineEditPath,
  routineWorkoutNavigation,
  routineWorkoutPath
} from './workoutNavigation'

describe('path builders', () => {
  it('builds the routine edit and canonical workout routes', () => {
    expect(routineEditPath('routine-1')).toBe('/routine/routine-1')
    expect(routineWorkoutPath('routine-1')).toBe('/routine/routine-1?workout=1')
  })

  // RoutineWorkoutContainer reads searchParams.get('workout') === '1'. Pin the
  // query string through the same parser it uses, so a change here that the
  // container would stop recognising fails loudly.
  it('produces a flag the routine container recognises', () => {
    const url = new URL(routineWorkoutPath('routine-1'), 'https://example.test')
    expect(url.pathname).toBe('/routine/routine-1')
    expect(url.searchParams.get(WORKOUT_PARAM)).toBe(WORKOUT_PARAM_VALUE)
    expect(url.searchParams.get('workout')).toBe('1')
  })
})

describe('activeWorkoutPath', () => {
  it('prefers the canonical routine route', () => {
    expect(activeWorkoutPath({ id: 'sess-1', routineId: 'routine-1' })).toBe(
      '/routine/routine-1?workout=1'
    )
  })

  // There is no session-id route to fall back to any more, so a session with no
  // routine has no workout route at all: it goes to the recovery surface rather
  // than to an invented path.
  it('sends a session with no routine to the home screen', () => {
    expect(activeWorkoutPath({ id: 'sess-1' })).toBe('/home')
    expect(activeWorkoutPath({ id: 'sess-1', routineId: null })).toBe('/home')
    expect(activeWorkoutPath({ id: 'sess-1', routineId: undefined })).toBe('/home')
    expect(activeWorkoutPath({})).toBe('/home')
    expect(activeWorkoutPath(null)).toBe('/home')
    expect(activeWorkoutPath(undefined)).toBe('/home')
  })

  it('never builds a route from a missing routine id', () => {
    for (const session of [
      { id: 'sess-1' },
      { id: 'sess-1', routineId: null },
      { id: 'sess-1', routineId: undefined },
      null
    ]) {
      const path = activeWorkoutPath(session)
      expect(path).not.toContain('undefined')
      expect(path).not.toContain('/routine/')
    }
  })

  // The old /workout/:sessionId route is gone; nothing may address a workout by
  // session id any more.
  it('never builds a session-id route', () => {
    expect(activeWorkoutPath({ id: 'sess-1', routineId: 'routine-1' })).not.toContain(
      '/workout/'
    )
    expect(activeWorkoutPath({ id: 'sess-1' })).not.toContain('/workout/')
  })

  // Home resumes by handing the recovery copy straight to this builder. The
  // route it produces must be one the container can resolve that same copy on.
  it('targets a routine the container will match the session against', () => {
    const session = { id: 'sess-1', routineId: 'routine-1', status: 'in_progress' }
    expect(activeWorkoutPath(session)).toBe(routineWorkoutPath(session.routineId))
    expect(isActiveWorkoutForRoutine(session, 'routine-1')).toBe(true)
  })
})

describe('routineWorkoutNavigation', () => {
  it('goes back to the routine editor by dropping the flag', () => {
    const nav = routineWorkoutNavigation('routine-1')
    expect(nav.back).toBe('/routine/routine-1')
    expect(nav.back).not.toContain('workout=1')
  })

  it('replaces rather than pushes, so Back does not re-enter the workout', () => {
    expect(routineWorkoutNavigation('routine-1').backReplace).toBe(true)
  })

  it('returns a swap to the same canonical workout route', () => {
    expect(routineWorkoutNavigation('routine-1').swapReturnTo).toBe(
      '/routine/routine-1?workout=1'
    )
  })

  it('keeps Back and the swap return distinct — only one carries the flag', () => {
    const nav = routineWorkoutNavigation('routine-1')
    expect(nav.swapReturnTo).toContain('workout=1')
    expect(nav.back).not.toContain('workout=1')
    expect(nav.swapReturnTo).not.toBe(nav.back)
  })
})
