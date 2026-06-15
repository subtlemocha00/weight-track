import { newId } from '../../utils/id'
import {
  DEFAULT_SETS_PER_EXERCISE,
  DEFAULT_REPS,
  DEFAULT_UNIT
} from '../routines/routineFactory'

/**
 * A fresh, uncompleted set for a session exercise. Mirrors the set shape used
 * by `createSessionFromRoutine` (reps/weight/unit/completed/timestamp).
 */
export function createSessionSet() {
  return {
    reps: DEFAULT_REPS,
    weight: null,
    unit: DEFAULT_UNIT,
    completed: false,
    timestamp: null
  }
}

/**
 * Build a session exercise from a library exercise object (built-in or custom)
 * for an exercise added mid-workout. Starts with the same default set count as
 * a routine exercise, all uncompleted. This only ever modifies the active
 * session — the source routine is untouched.
 */
export function createSessionExercise(exercise, order) {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    order,
    sets: Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, createSessionSet),
    notes: '',
    supersetGroup: null
  }
}

/**
 * Snapshot a routine into a fresh in-progress workout session.
 *
 * The session is structurally locked at start time — its exercises/sets count
 * matches the routine and won't change during the workout (per Phase 4 spec).
 * Only set values (reps/weight/unit), completion, and exercise order can be
 * edited during a session.
 */
export function createSessionFromRoutine(routine) {
  return {
    id: newId(),
    routineId: routine.id,
    routineName: routine.name,
    startedAt: Date.now(),
    completedAt: null,
    status: 'in_progress',
    exercises: routine.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: index,
      sets: exercise.sets.map((set) => ({
        reps: set.reps ?? 0,
        weight: set.targetWeight ?? null,
        unit: set.unit ?? 'lb',
        completed: false,
        timestamp: null
      })),
      notes: exercise.notes ?? '',
      supersetGroup: exercise.supersetGroup ?? null
    }))
  }
}
