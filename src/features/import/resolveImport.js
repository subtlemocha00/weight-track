import { resolveExercise } from '../../services/exercises'
import { RESOLUTION } from './importTypes'

/**
 * Resolve step of the import pipeline — the integration point with the Phase 1
 * exercise resolver.
 *
 * Annotates every exercise in a NormalizedImport with its resolution against
 * the built-in library first, then the user's custom library (exact,
 * case-insensitive match — no fuzzy matching). The future parser will use the
 * `not_found` results to create custom exercises; this phase only surfaces
 * them in the preview.
 *
 * Custom exercises are passed in (already loaded by the caller) rather than
 * fetched here, so a whole import resolves with a single Firestore read.
 *
 * @param {{name: string, days: Array}} normalized
 * @param {Array} [customExercises]
 * @returns {{name: string, days: Array, summary: {builtin: number, custom: number, notFound: number}}}
 */
export function resolveImport(normalized, customExercises = []) {
  const summary = { builtin: 0, custom: 0, notFound: 0 }

  const days = (Array.isArray(normalized?.days) ? normalized.days : []).map(
    (day) => ({
      name: day.name,
      exercises: (Array.isArray(day.exercises) ? day.exercises : []).map(
        (exercise) => {
          const result = resolveExercise(exercise.name, customExercises)

          if (!result.found) {
            summary.notFound += 1
          } else if (result.source === RESOLUTION.CUSTOM) {
            summary.custom += 1
          } else {
            summary.builtin += 1
          }

          return { ...exercise, resolution: result }
        }
      )
    })
  )

  return { name: normalized?.name ?? '', days, summary }
}
