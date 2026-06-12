import { newId } from '../../utils/id'
import { createBlankRoutine, createBlankSet } from '../routines/routineFactory'

/**
 * Save step bridge: convert a ResolvedImport into standard routine objects.
 *
 * Each workout day becomes one routine, built with the existing routine
 * factory so imported routines are structurally identical to manually created
 * ones — same schema, same fields, no import marker. The save flow then writes
 * them through the normal `saveRoutine` service.
 *
 * exerciseId rules:
 *   - resolved (built-in or custom) → reuse the resolved exercise's real id
 *   - not found → mint a fresh id (newId) and keep the name inline
 *
 * In the XLSX flow the save step (see pipeline.js) first creates custom
 * exercises for any not-found names, so by the time the import reaches here
 * everything is resolved and the minted-id fallback below is effectively a
 * safety net rather than the normal path. Routines store the exercise name
 * inline (see routineFactory) regardless, so a minted id still renders/runs.
 *
 * @param {{name: string, days: Array}} resolvedImport
 * @returns {Array} routine objects ready for saveRoutine
 */
export function buildRoutinesFromImport(resolvedImport) {
  const days = Array.isArray(resolvedImport?.days) ? resolvedImport.days : []

  return days.map((day) => {
    const base = createBlankRoutine()
    return {
      ...base,
      name: day.name,
      exercises: day.exercises.map((exercise, order) =>
        buildRoutineExercise(exercise, order)
      )
    }
  })
}

function buildRoutineExercise(exercise, order) {
  const resolved = exercise.resolution?.found
    ? exercise.resolution.exercise
    : null

  return {
    exerciseId: resolved?.id || newId(),
    name: exercise.name,
    order,
    sets: Array.from({ length: exercise.sets }, () => ({
      ...createBlankSet(),
      reps: exercise.reps,
      // Optional target weight from the spreadsheet's Weight column (null when
      // absent), carried onto every set at the routine's default unit.
      targetWeight: exercise.weight ?? null
    })),
    notes: exercise.notes ?? '',
    supersetGroup: null
  }
}
