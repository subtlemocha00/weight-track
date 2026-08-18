import { describe, expect, it } from 'vitest'
import { sessionReducer } from './sessionReducer'

function session() {
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
          { reps: 8, weight: 185, unit: 'lb', completed: true, timestamp: 1200 },
          { reps: 6, weight: 195, unit: 'lb', completed: false, timestamp: null }
        ]
      },
      {
        exerciseId: 'row',
        name: 'Barbell Row',
        order: 1,
        notes: '',
        supersetId: null,
        sets: [{ reps: 10, weight: 60, unit: 'kg', completed: false, timestamp: null }]
      }
    ]
  }
}

describe('ADD_SET', () => {
  it('appends one set to the target exercise only', () => {
    const next = sessionReducer(session(), { type: 'ADD_SET', index: 0 })

    expect(next.exercises[0].sets).toHaveLength(3)
    expect(next.exercises[1].sets).toHaveLength(1)
  })

  it('carries reps, weight and unit over from the previous set', () => {
    const next = sessionReducer(session(), { type: 'ADD_SET', index: 1 })
    const added = next.exercises[1].sets[1]

    expect(added.reps).toBe(10)
    expect(added.weight).toBe(60)
    expect(added.unit).toBe('kg')
  })

  it('never carries completion over', () => {
    const state = session()
    state.exercises[0].sets = [state.exercises[0].sets[0]] // only the completed one
    const next = sessionReducer(state, { type: 'ADD_SET', index: 0 })

    expect(next.exercises[0].sets[1].completed) .toBe(false)
    expect(next.exercises[0].sets[1].timestamp).toBe(null)
  })

  it('falls back to defaults for an exercise with no sets', () => {
    const state = session()
    state.exercises[1].sets = []
    const next = sessionReducer(state, { type: 'ADD_SET', index: 1 })

    expect(next.exercises[1].sets).toHaveLength(1)
    expect(next.exercises[1].sets[0].completed).toBe(false)
    expect(next.exercises[1].sets[0].weight).toBe(null)
  })

  it('leaves existing sets untouched', () => {
    const before = session()
    const next = sessionReducer(before, { type: 'ADD_SET', index: 0 })

    expect(next.exercises[0].sets[0]).toEqual(before.exercises[0].sets[0])
    expect(next.exercises[0].sets[1]).toEqual(before.exercises[0].sets[1])
  })

  it('ignores an out-of-range exercise', () => {
    const before = session()
    expect(sessionReducer(before, { type: 'ADD_SET', index: 9 })).toBe(before)
  })
})

describe('REMOVE_SET', () => {
  it('removes the set at the given index', () => {
    const next = sessionReducer(session(), {
      type: 'REMOVE_SET',
      exerciseIndex: 0,
      setIndex: 0
    })

    expect(next.exercises[0].sets).toHaveLength(1)
    expect(next.exercises[0].sets[0].weight).toBe(195)
  })

  it('touches no other exercise', () => {
    const before = session()
    const next = sessionReducer(before, {
      type: 'REMOVE_SET',
      exerciseIndex: 0,
      setIndex: 1
    })

    expect(next.exercises[1]).toEqual(before.exercises[1])
  })

  it('allows removing the last remaining set', () => {
    const next = sessionReducer(session(), {
      type: 'REMOVE_SET',
      exerciseIndex: 1,
      setIndex: 0
    })

    expect(next.exercises[1].sets).toEqual([])
  })

  it('ignores an out-of-range set or exercise', () => {
    const before = session()
    expect(
      sessionReducer(before, { type: 'REMOVE_SET', exerciseIndex: 0, setIndex: 9 })
    ).toBe(before)
    expect(
      sessionReducer(before, { type: 'REMOVE_SET', exerciseIndex: 9, setIndex: 0 })
    ).toBe(before)
  })
})

describe('session identity is never touched by set edits', () => {
  it('keeps id, routineId and status across add and remove', () => {
    const before = session()
    const added = sessionReducer(before, { type: 'ADD_SET', index: 0 })
    const removed = sessionReducer(added, {
      type: 'REMOVE_SET',
      exerciseIndex: 0,
      setIndex: 0
    })

    for (const state of [added, removed]) {
      expect(state.id).toBe('sess-1')
      expect(state.routineId).toBe('routine-1')
      expect(state.status).toBe('in_progress')
      expect(state.startedAt).toBe(1000)
    }
  })

  // The routine reducer stamps updatedAt on every edit; the session reducer
  // must not acquire anything like it — a session is not a template.
  it('adds no updatedAt stamp', () => {
    const next = sessionReducer(session(), { type: 'ADD_SET', index: 0 })
    expect(next.updatedAt).toBeUndefined()
  })

  it('does not mutate the state it was given', () => {
    const before = session()
    const snapshot = JSON.stringify(before)

    sessionReducer(before, { type: 'ADD_SET', index: 0 })
    sessionReducer(before, { type: 'REMOVE_SET', exerciseIndex: 0, setIndex: 0 })

    expect(JSON.stringify(before)).toBe(snapshot)
  })
})
