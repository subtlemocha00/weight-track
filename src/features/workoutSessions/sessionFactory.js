import { newId } from '../../utils/id'

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
