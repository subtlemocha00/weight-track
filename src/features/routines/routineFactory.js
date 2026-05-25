import { newId } from '../../utils/id'

export const DEFAULT_UNIT = 'lb'
export const DEFAULT_SETS_PER_EXERCISE = 3
export const DEFAULT_REPS = 8

export function createBlankRoutine() {
  const now = Date.now()
  return {
    id: newId(),
    name: '',
    createdAt: now,
    updatedAt: now,
    exercises: []
  }
}

export function createBlankSet() {
  return {
    reps: DEFAULT_REPS,
    targetWeight: null,
    unit: DEFAULT_UNIT,
    restSeconds: null
  }
}

export function createRoutineExercise(exercise, order) {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    order,
    sets: Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, createBlankSet),
    notes: '',
    supersetGroup: null
  }
}
