import { describe, it, expect } from 'vitest'
import { swapSessionExercise } from './swapExercise'

function sampleSession() {
  return {
    id: 'sess-1',
    routineId: 'routine-1',
    status: 'in_progress',
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        supersetId: 2,
        notes: 'Pause on chest',
        sets: [
          { reps: 8, weight: 185, unit: 'lb', completed: true, timestamp: 111 },
          { reps: 8, weight: 185, unit: 'lb', completed: true, timestamp: 222 },
          { reps: 8, weight: 185, unit: 'lb', completed: false, timestamp: null }
        ]
      },
      {
        exerciseId: 'squat',
        name: 'Squat',
        order: 1,
        supersetId: null,
        notes: '',
        sets: [{ reps: 5, weight: 225, unit: 'lb', completed: false, timestamp: null }]
      }
    ]
  }
}

const replacement = {
  id: 'machine-chest-press',
  name: 'Machine Chest Press',
  instructions: ['Sit', 'Press'],
  videoUrl: 'https://example.com/v',
  bodyPart: 'Chest'
}

describe('swapSessionExercise', () => {
  it('replaces only exerciseId and name on the targeted exercise', () => {
    const next = swapSessionExercise(sampleSession(), 0, replacement)
    const swapped = next.exercises[0]
    expect(swapped.exerciseId).toBe('machine-chest-press')
    expect(swapped.name).toBe('Machine Chest Press')
  })

  it('preserves all logged workout data (sets, completion, notes, superset, order)', () => {
    const before = sampleSession()
    const next = swapSessionExercise(before, 0, replacement)
    const swapped = next.exercises[0]
    expect(swapped.sets).toEqual(before.exercises[0].sets)
    expect(swapped.notes).toBe('Pause on chest')
    expect(swapped.supersetId).toBe(2)
    expect(swapped.order).toBe(0)
  })

  it('does not copy library metadata onto the session exercise (it resolves by id)', () => {
    const next = swapSessionExercise(sampleSession(), 0, replacement)
    const swapped = next.exercises[0]
    expect(swapped).not.toHaveProperty('instructions')
    expect(swapped).not.toHaveProperty('videoUrl')
    expect(swapped).not.toHaveProperty('bodyPart')
  })

  it('leaves other exercises untouched', () => {
    const before = sampleSession()
    const next = swapSessionExercise(before, 0, replacement)
    expect(next.exercises[1]).toEqual(before.exercises[1])
  })

  it('does not mutate the input session', () => {
    const before = sampleSession()
    const snapshot = JSON.parse(JSON.stringify(before))
    swapSessionExercise(before, 0, replacement)
    expect(before).toEqual(snapshot)
  })

  it('returns the session unchanged for an out-of-range index', () => {
    const before = sampleSession()
    expect(swapSessionExercise(before, 9, replacement)).toBe(before)
    expect(swapSessionExercise(before, -1, replacement)).toBe(before)
  })

  it('returns the session unchanged when the replacement has no id', () => {
    const before = sampleSession()
    expect(swapSessionExercise(before, 0, { name: 'No Id' })).toBe(before)
    expect(swapSessionExercise(before, 0, null)).toBe(before)
  })
})
