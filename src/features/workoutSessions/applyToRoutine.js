/**
 * Apply set/reps changes and exercise ordering from a completed session back
 * onto its source routine. Only the fields the Phase 4 spec explicitly lists
 * (set values + ordering) are touched — restSeconds, notes, and supersetGroup
 * stay on the routine.
 *
 * The routine's exercises are matched to the session by `exerciseId`. If an
 * exercise disappeared from the routine between start and finish, it is
 * skipped. Routine exercises not present in the session are preserved at the
 * tail of the array so users don't lose data.
 */
export function applySessionToRoutine(routine, session) {
  const routineExercisesById = new Map(
    routine.exercises.map((exercise) => [exercise.exerciseId, exercise])
  )

  const updatedExercises = []
  const usedIds = new Set()

  for (const sessionExercise of session.exercises) {
    const original = routineExercisesById.get(sessionExercise.exerciseId)
    if (!original) continue
    usedIds.add(sessionExercise.exerciseId)

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

    updatedExercises.push({
      ...original,
      order: updatedExercises.length,
      sets: updatedSets
    })
  }

  // Preserve any routine exercises the session didn't touch (e.g. routine was
  // edited mid-session) at the end, in their original relative order.
  for (const exercise of routine.exercises) {
    if (usedIds.has(exercise.exerciseId)) continue
    updatedExercises.push({
      ...exercise,
      order: updatedExercises.length
    })
  }

  return {
    ...routine,
    exercises: updatedExercises,
    updatedAt: Date.now()
  }
}
