import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { createCustomExercise } from '../../features/exercises/customExerciseFactory'
import { normalizeExercise } from '../exercises'

/**
 * Firestore access for user-owned custom exercises.
 *
 *   /users/{uid}/customExercises/{exerciseId}
 *
 * These live alongside the static built-in dataset and are private to the
 * signed-in user. This module is the only place that reads/writes the
 * collection; the resolver and (future) import flow consume the lists it
 * returns rather than querying directly.
 */

function customExercisesCollection(uid) {
  return collection(firestore, 'users', uid, 'customExercises')
}

function customExerciseDocRef(uid, exerciseId) {
  return doc(firestore, 'users', uid, 'customExercises', exerciseId)
}

export async function listCustomExercises(uid) {
  const snap = await getDocs(
    query(customExercisesCollection(uid), orderBy('name'))
  )
  // Normalize on read so docs written before videoUrl existed still surface the
  // field (as null) — keeps every exercise object in the app uniformly shaped.
  return snap.docs.map((d) => normalizeExercise({ id: d.id, ...d.data() }))
}

export async function getCustomExerciseById(uid, exerciseId) {
  if (!exerciseId) return null
  const snap = await getDoc(customExerciseDocRef(uid, exerciseId))
  if (!snap.exists()) return null
  return normalizeExercise({ id: snap.id, ...snap.data() })
}

/**
 * Create or overwrite a single custom exercise. Accepts a partial input,
 * normalizes it through the factory (so shape/defaults stay consistent), then
 * persists the body without the `id` field — the id is the document key and is
 * recovered from `snap.id` on read, matching the routines/sessions convention.
 *
 * Returns the full exercise object (including `id`) for the caller.
 */
export async function saveCustomExercise(uid, exercise) {
  const full = createCustomExercise(exercise)
  const { id, ...body } = full
  await setDoc(customExerciseDocRef(uid, id), body)
  return full
}

export async function deleteCustomExercise(uid, exerciseId) {
  await deleteDoc(customExerciseDocRef(uid, exerciseId))
}
