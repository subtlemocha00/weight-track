import { DEFAULT_REPS, DEFAULT_UNIT } from '../routines/routineFactory'

/**
 * Materialize a routine exercise from a session exercise that was added during
 * the workout (no routine counterpart). Session sets carry `weight`; routine
 * sets carry `targetWeight` and a `restSeconds` field, so the shapes are
 * translated here. restSeconds defaults to null (per-set rest is not edited
 * during a workout).
 */
function sessionExerciseToRoutineExercise(sessionExercise, order) {
  return {
    exerciseId: sessionExercise.exerciseId,
    name: sessionExercise.name,
    order,
    sets: sessionExercise.sets.map((set) => ({
      reps: set.reps ?? DEFAULT_REPS,
      targetWeight: set.weight ?? null,
      unit: set.unit ?? DEFAULT_UNIT,
      restSeconds: null
    })),
    notes: sessionExercise.notes ?? '',
    supersetId: sessionExercise.supersetId ?? null
  }
}

/**
 * Apply changes from a completed session back onto its source routine. This is
 * ONLY called when the user explicitly opts in after finishing a workout — the
 * routine template is never modified automatically during a session.
 *
 * The session's exercise list is treated as the desired routine shape, so all
 * edits made during the workout are reflected:
 *   - set values (reps/weight/unit) and exercise ordering are applied
 *   - superset assignments made during the workout are applied
 *   - exercises added during the workout are materialized into the routine
 *   - exercises removed during the workout are dropped from the routine
 *   - sets added or removed during the workout change the routine's set count
 *
 * Routine-only fields not edited during a workout (restSeconds, notes) are
 * preserved for exercises and sets that existed before the session. A set with
 * no counterpart in the routine has no such fields to keep, so it starts with
 * restSeconds unset.
 */
export function applySessionToRoutine(routine, session) {
  const routineExercisesById = new Map(
    routine.exercises.map((exercise) => [exercise.exerciseId, exercise])
  )

  const updatedExercises = session.exercises.map((sessionExercise, order) => {
    const original = routineExercisesById.get(sessionExercise.exerciseId)

    // Added during the workout — build a fresh routine exercise from it.
    if (!original) {
      return sessionExerciseToRoutineExercise(sessionExercise, order)
    }

    // Existed before — the session's sets are the desired shape, so drive the
    // mapping from them. Iterating the routine's sets instead would silently
    // drop sets added during the workout and resurrect ones removed from it.
    const updatedSets = sessionExercise.sets.map((sessionSet, index) => {
      const routineSet = original.sets[index]

      // Added during the workout: no routine set to preserve fields from, so
      // build one the same way a newly materialized exercise does.
      if (!routineSet) {
        return {
          reps: sessionSet.reps ?? DEFAULT_REPS,
          targetWeight: sessionSet.weight ?? null,
          unit: sessionSet.unit ?? DEFAULT_UNIT,
          restSeconds: null
        }
      }

      return {
        ...routineSet,
        reps: sessionSet.reps,
        targetWeight: sessionSet.weight,
        unit: sessionSet.unit
      }
    })

    return {
      ...original,
      order,
      sets: updatedSets,
      // Carry the superset assignment edited during the workout.
      supersetId: sessionExercise.supersetId ?? null
    }
  })

  return {
    ...routine,
    exercises: updatedExercises,
    updatedAt: Date.now()
  }
}
