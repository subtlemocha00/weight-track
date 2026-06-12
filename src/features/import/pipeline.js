import {
  listCustomExercises,
  saveCustomExercise
} from '../../services/customExercises'
import { normalizeExerciseName } from '../../services/exercises'
import { saveRoutine } from '../../services/routines'
import { normalizeImport } from './normalizeImport'
import { validateImport } from './validateImport'
import { resolveImport } from './resolveImport'
import { buildRoutinesFromImport } from './buildRoutines'
import { RESOLUTION } from './importTypes'

/**
 * Orchestrates the read-only portion of the import pipeline into a single
 * preview model:
 *
 *   raw → normalize → validate → resolve
 *
 * Loads the user's custom exercises once so resolution can consult both
 * libraries. Returns everything the preview screen needs. Pure aside from the
 * single custom-exercise read; performs no writes.
 *
 * @param {import('./importTypes').RawImport} raw
 * @param {string} uid
 * @returns {Promise<{normalized, validation, resolved}>}
 */
export async function prepareImportPreview(raw, uid) {
  const normalized = normalizeImport(raw)
  const validation = validateImport(normalized)

  let customExercises = []
  try {
    customExercises = await listCustomExercises(uid)
  } catch {
    // Non-fatal: with no custom library, resolution falls back to built-in
    // matches only. The preview still renders and validation is unaffected.
    customExercises = []
  }

  const resolved = resolveImport(normalized, customExercises)
  return { normalized, validation, resolved }
}

/**
 * Save step:
 *   1. Create a custom exercise (Phase 1) for every not-found name so the
 *      saved routine references real exercise docs — never a dangling id.
 *   2. Build standard routines (one per workout day) and persist them through
 *      the existing routine service.
 *
 * The result is indistinguishable from manually created routines.
 *
 * @param {string} uid
 * @param {{name: string, days: Array}} resolved
 * @returns {Promise<Array>} the saved routine objects
 */
export async function saveImportedRoutines(uid, resolved) {
  const materialized = await createCustomExercisesForImport(uid, resolved)
  const routines = buildRoutinesFromImport(materialized)
  const saved = []
  for (const routine of routines) {
    saved.push(await saveRoutine(uid, routine))
  }
  return saved
}

/**
 * For each distinct not-found exercise name, create one custom exercise
 * (Phase 1) and return a resolved import in which those exercises now resolve
 * to the freshly created custom doc. Names are de-duplicated case-insensitively
 * so a name appearing on multiple days creates a single custom exercise.
 *
 * Already-resolved (built-in/custom) exercises are left untouched.
 */
async function createCustomExercisesForImport(uid, resolved) {
  const newNames = new Map() // normalized key -> original display name
  for (const day of resolved.days) {
    for (const exercise of day.exercises) {
      if (exercise.resolution?.found) continue
      const key = normalizeExerciseName(exercise.name)
      if (key && !newNames.has(key)) newNames.set(key, exercise.name)
    }
  }

  if (newNames.size === 0) return resolved

  const created = new Map() // normalized key -> created exercise
  for (const [key, name] of newNames) {
    const exercise = await saveCustomExercise(uid, { name })
    created.set(key, exercise)
  }

  return {
    ...resolved,
    days: resolved.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        if (exercise.resolution?.found) return exercise
        const match = created.get(normalizeExerciseName(exercise.name))
        if (!match) return exercise
        return {
          ...exercise,
          resolution: {
            found: true,
            source: RESOLUTION.CUSTOM,
            exercise: match
          }
        }
      })
    }))
  }
}
