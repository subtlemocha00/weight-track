import { doc, writeBatch } from 'firebase/firestore'
import { firestore } from '../../services/firebase'
import { listCustomExercises } from '../../services/customExercises'
import { createCustomExercise } from '../exercises/customExerciseFactory'
import { normalizeExerciseName } from '../../services/exercises'
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
 * Save step — atomic, all-or-nothing (Phase 5 "no partial save" guarantee).
 *
 * Everything is staged into a single Firestore writeBatch and committed once:
 *   1. A custom exercise (Phase 1) for every not-found name, so saved routines
 *      reference real exercise docs — never a dangling id.
 *   2. One standard routine per workout day.
 *
 * If the commit fails, NOTHING is written — no half-imported routine, no orphan
 * custom exercises. The saved routines are structurally identical to manually
 * created ones. Order is preserved end to end (no sorting/regrouping), so the
 * saved result matches the preview exactly.
 *
 * @param {string} uid
 * @param {{name: string, days: Array}} resolved
 * @returns {Promise<Array>} the saved routine objects (with ids)
 */
export async function saveImportedRoutines(uid, resolved) {
  const batch = writeBatch(firestore)

  // 1. Stage custom exercises for not-found names and get a fully-resolved
  //    import (every exercise now points at a real exercise id).
  const materialized = stageCustomExercises(uid, resolved, batch)

  // 2. Stage one routine per day. This mirrors saveRoutine's payload shape
  //    (createdAt/updatedAt, id kept out of the body) so batched imports stay
  //    identical to routine-service writes — without leaving the batch.
  const now = Date.now()
  const routines = buildRoutinesFromImport(materialized)
  const saved = routines.map((routine) => {
    const payload = {
      ...routine,
      createdAt: routine.createdAt || now,
      updatedAt: now
    }
    const { id, ...body } = payload
    batch.set(doc(firestore, 'users', uid, 'routines', id), body)
    return payload
  })

  // 3. Commit atomically.
  await batch.commit()
  return saved
}

/**
 * For each distinct not-found exercise name, stage one custom exercise write on
 * the batch and return a resolved import in which those exercises now resolve to
 * the freshly created custom doc. Names are de-duplicated case-insensitively so
 * a name appearing on multiple days creates a single custom exercise.
 *
 * Already-resolved (built-in/custom) exercises are left untouched. Nothing is
 * written here — the caller commits the batch.
 */
function stageCustomExercises(uid, resolved, batch) {
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
    const full = createCustomExercise({ name })
    const { id, ...body } = full
    batch.set(doc(firestore, 'users', uid, 'customExercises', id), body)
    created.set(key, full)
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
