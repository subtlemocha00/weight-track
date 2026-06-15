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
    supersetGroup: sessionExercise.supersetGroup ?? null
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
 *   - exercises added during the workout are materialized into the routine
 *   - exercises removed during the workout are dropped from the routine
 *
 * Routine-only fields not edited during a workout (restSeconds, notes,
 * supersetGroup) are preserved for exercises that existed before the session.
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

    // Existed before — update set values in place, keep routine-only fields.
    const updatedSets = original.sets.map((routineSet, index) => {
      const sessionSet = sessionExercise.sets[index]
      if (!sessionSet) return routineSet
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
      sets: updatedSets
    }
  })

  return {
    ...routine,
    exercises: updatedExercises,
    updatedAt: Date.now()
  }
}
