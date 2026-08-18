import { describe, expect, it } from 'vitest'
import { applySessionToRoutine } from './applyToRoutine'

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
        supersetId: null,
        sets: [
          { reps: 8, targetWeight: 185, unit: 'lb', restSeconds: 90 },
          { reps: 8, targetWeight: 185, unit: 'lb', restSeconds: 90 }
        ]
      }
    ]
  }
}

function session(exercises) {
  return {
    id: 'sess-1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    startedAt: 1000,
    completedAt: 2000,
    status: 'completed',
    exercises
  }
}

function benchSets(count, weight = 185) {
  return Array.from({ length: count }, () => ({
    reps: 8,
    weight,
    unit: 'lb',
    completed: true,
    timestamp: 1500
  }))
}

function bench(sets) {
  return {
    exerciseId: 'bench-press',
    name: 'Bench Press',
    order: 0,
    notes: 'Pause on chest',
    supersetId: null,
    sets
  }
}

describe('sets added during the workout', () => {
  it('are carried into the routine', () => {
    const updated = applySessionToRoutine(routine(), session([bench(benchSets(4))]))

    expect(updated.exercises[0].sets).toHaveLength(4)
  })

  it('take their logged values', () => {
    const sets = benchSets(2)
    sets.push({ reps: 5, weight: 205, unit: 'lb', completed: true, timestamp: 1600 })
    const updated = applySessionToRoutine(routine(), session([bench(sets)]))

    expect(updated.exercises[0].sets[2]).toEqual({
      reps: 5,
      targetWeight: 205,
      unit: 'lb',
      restSeconds: null
    })
  })

  it('leave the pre-existing sets rest values intact', () => {
    const updated = applySessionToRoutine(routine(), session([bench(benchSets(4))]))

    expect(updated.exercises[0].sets[0].restSeconds).toBe(90)
    expect(updated.exercises[0].sets[1].restSeconds).toBe(90)
    expect(updated.exercises[0].sets[3].restSeconds).toBe(null)
  })
})

describe('sets removed during the workout', () => {
  it('are dropped from the routine', () => {
    const updated = applySessionToRoutine(routine(), session([bench(benchSets(1))]))

    expect(updated.exercises[0].sets).toHaveLength(1)
  })

  it('do not resurrect from the routine template', () => {
    const updated = applySessionToRoutine(routine(), session([bench([])]))

    expect(updated.exercises[0].sets).toEqual([])
  })
})

describe('unchanged set counts still behave as before', () => {
  it('applies logged values and keeps routine-only fields', () => {
    const sets = benchSets(2, 190)
    const updated = applySessionToRoutine(routine(), session([bench(sets)]))

    expect(updated.exercises[0].sets).toEqual([
      { reps: 8, targetWeight: 190, unit: 'lb', restSeconds: 90 },
      { reps: 8, targetWeight: 190, unit: 'lb', restSeconds: 90 }
    ])
  })

  it('keeps the exercise notes from the routine', () => {
    const updated = applySessionToRoutine(
      routine(),
      session([{ ...bench(benchSets(2)), notes: 'scribbled mid-workout' }])
    )

    expect(updated.exercises[0].notes).toBe('Pause on chest')
  })
})

describe('routine identity', () => {
  it('never changes id, name or createdAt', () => {
    const source = routine()
    const updated = applySessionToRoutine(source, session([bench(benchSets(4))]))

    expect(updated.id).toBe('routine-1')
    expect(updated.name).toBe('Push Day')
    expect(updated.createdAt).toBe(500)
  })

  it('does not mutate the routine it was given', () => {
    const source = routine()
    const snapshot = JSON.stringify(source)

    applySessionToRoutine(source, session([bench(benchSets(5))]))

    expect(JSON.stringify(source)).toBe(snapshot)
  })
})
