import { describe, expect, it } from 'vitest'
import { isActiveWorkoutForRoutine } from './resolveActiveWorkout'
import {
  WORKOUT_PARAM,
  WORKOUT_PARAM_VALUE,
  activeWorkoutPath,
  legacyWorkoutNavigation,
  legacyWorkoutPath,
  routineEditPath,
  routineWorkoutNavigation,
  routineWorkoutPath
} from './workoutNavigation'

describe('path builders', () => {
  it('builds the routine edit and canonical workout routes', () => {
    expect(routineEditPath('routine-1')).toBe('/routine/routine-1')
    expect(routineWorkoutPath('routine-1')).toBe('/routine/routine-1?workout=1')
  })

  it('builds the legacy session route', () => {
    expect(legacyWorkoutPath('sess-1')).toBe('/workout/sess-1')
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

  it('falls back to the legacy route when there is no routine', () => {
    expect(activeWorkoutPath({ id: 'sess-1' })).toBe('/workout/sess-1')
    expect(activeWorkoutPath({ id: 'sess-1', routineId: null })).toBe('/workout/sess-1')
  })

  it('never builds a route from a missing routine id', () => {
    expect(activeWorkoutPath({ id: 'sess-1', routineId: undefined })).not.toContain(
      'undefined'
    )
  })

  // Home resumes by handing the recovery copy straight to this builder. The
  // route it produces must be one the container can resolve that same copy on.
  it('targets a routine the container will match the session against', () => {
    const session = { id: 'sess-1', routineId: 'routine-1', status: 'in_progress' }
    expect(activeWorkoutPath(session)).toBe(routineWorkoutPath(session.routineId))
    expect(isActiveWorkoutForRoutine(session, 'routine-1')).toBe(true)
  })
})

describe('legacyWorkoutNavigation', () => {
  it('keeps the pre-existing destinations', () => {
    expect(legacyWorkoutNavigation('sess-1')).toEqual({
      back: '/home',
      backReplace: false,
      swapReturnTo: '/workout/sess-1'
    })
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

  it('differs from the legacy set on every destination', () => {
    const routine = routineWorkoutNavigation('routine-1')
    const legacy = legacyWorkoutNavigation('sess-1')
    expect(routine.back).not.toBe(legacy.back)
    expect(routine.swapReturnTo).not.toBe(legacy.swapReturnTo)
    expect(routine.backReplace).not.toBe(legacy.backReplace)
  })
})
