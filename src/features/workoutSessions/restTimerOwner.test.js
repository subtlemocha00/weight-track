import { describe, expect, it } from 'vitest'
import { findRestTimerOwner } from './restTimerOwner'
import { sessionReducer } from './sessionReducer'

const REST_AT = 5000

function sets() {
  return [
    { reps: 8, weight: 100, unit: 'lb', completed: true, timestamp: 1000 },
    // The set that started the rest.
    { reps: 8, weight: 100, unit: 'lb', completed: true, timestamp: REST_AT },
    { reps: 8, weight: 100, unit: 'lb', completed: true, timestamp: 9000 },
    { reps: 8, weight: 100, unit: 'lb', completed: false, timestamp: null }
  ]
}

function sessionWith(exerciseSets) {
  return {
    id: 'sess-1',
    routineId: 'routine-1',
    status: 'in_progress',
    exercises: [
      { exerciseId: 'bench-press', name: 'Bench Press', order: 0, notes: '', supersetId: null, sets: exerciseSets }
    ]
  }
}

describe('findRestTimerOwner', () => {
  it('finds the set that started the rest', () => {
    expect(findRestTimerOwner(sets(), REST_AT)).toBe(1)
  })

  it('follows that set when an earlier one is removed', () => {
    // The bug this exists to prevent: the timer was tracked by index, so
    // removing set 1 slid it onto the set that moved into index 1.
    const next = sessionReducer(sessionWith(sets()), {
      type: 'REMOVE_SET',
      exerciseIndex: 0,
      setIndex: 0
    })

    const owner = findRestTimerOwner(next.exercises[0].sets, REST_AT)
    expect(owner).toBe(0)
    expect(next.exercises[0].sets[owner].timestamp).toBe(REST_AT)
  })

  it('ends the rest when the set that started it is removed', () => {
    const next = sessionReducer(sessionWith(sets()), {
      type: 'REMOVE_SET',
      exerciseIndex: 0,
      setIndex: 1
    })

    expect(findRestTimerOwner(next.exercises[0].sets, REST_AT)).toBe(-1)
  })

  it('ends the rest when that set is marked not done again', () => {
    const next = sessionReducer(sessionWith(sets()), {
      type: 'TOGGLE_SET_COMPLETED',
      exerciseIndex: 0,
      setIndex: 1
    })

    expect(next.exercises[0].sets[1].completed).toBe(false)
    expect(findRestTimerOwner(next.exercises[0].sets, REST_AT)).toBe(-1)
  })

  it('keeps the rest through edits that do not touch the set list', () => {
    // Adding a set, changing units and logging reps all rebuild the sets; the
    // rest must survive all of them.
    let state = sessionWith(sets())
    state = sessionReducer(state, { type: 'ADD_SET', index: 0 })
    state = sessionReducer(state, { type: 'SET_EXERCISE_UNIT', index: 0, unit: 'kg' })
    state = sessionReducer(state, {
      type: 'UPDATE_SET',
      exerciseIndex: 0,
      setIndex: 3,
      patch: { reps: 5 }
    })

    expect(findRestTimerOwner(state.exercises[0].sets, REST_AT)).toBe(1)
  })

  it('finds nothing for an uncompleted, absent or unknown set', () => {
    expect(findRestTimerOwner(sets(), 4242)).toBe(-1)
    expect(findRestTimerOwner(sets(), null)).toBe(-1)
    expect(findRestTimerOwner(sets(), undefined)).toBe(-1)
    expect(findRestTimerOwner([], REST_AT)).toBe(-1)
    expect(findRestTimerOwner(undefined, REST_AT)).toBe(-1)
  })

  it('never matches a set that is not completed', () => {
    // A cleared timestamp is null, so an uncompleted set cannot own a rest even
    // if the lookup is asked for null.
    const uncompleted = [{ reps: 8, weight: 100, unit: 'lb', completed: false, timestamp: null }]
    expect(findRestTimerOwner(uncompleted, null)).toBe(-1)
  })
})
