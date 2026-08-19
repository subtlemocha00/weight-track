import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { createRoutineDuplicate } from '../../features/routines/routineFactory'

function routinesCollection(uid) {
  return collection(firestore, 'users', uid, 'routines')
}

function routineDocRef(uid, routineId) {
  return doc(firestore, 'users', uid, 'routines', routineId)
}

export async function listRoutines(uid) {
  const snap = await getDocs(
    query(routinesCollection(uid), orderBy('updatedAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getRoutine(uid, routineId) {
  const snap = await getDoc(routineDocRef(uid, routineId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function saveRoutine(uid, routine) {
  const now = Date.now()
  const payload = {
    ...routine,
    createdAt: routine.createdAt || now,
    updatedAt: now
  }
  // The Firestore document id is `routine.id`; we don't write the id field into
  // the document body — it's recovered from `snap.id` on read.
  const { id, ...body } = payload
  await setDoc(routineDocRef(uid, id), body)
  return payload
}

/**
 * Star or unstar a routine.
 *
 * A single-field update, not a saveRoutine: saveRoutine rewrites the whole
 * document and stamps updatedAt, and starring is neither an edit to the routine
 * nor a reason for it to jump up a list ordered by last edit. Writing only this
 * field also means the caller needs no copy of the routine to write back, so a
 * star pressed on the list can never overwrite an edit being made elsewhere with
 * a stale one.
 *
 * The favourite lives on the routine document itself, so deleting a routine
 * takes its favourite with it — there is nothing else to clean up.
 */
export async function setRoutineFavorite(uid, routineId, favorite) {
  await updateDoc(routineDocRef(uid, routineId), { favorite: favorite === true })
}

export async function deleteRoutine(uid, routineId) {
  await deleteDoc(routineDocRef(uid, routineId))
}

/**
 * Create an independent copy of a routine.
 *
 * Builds a deep-cloned duplicate (new id, "(Copy)" name, no original timestamps
 * or history) and persists it through the normal saveRoutine path — a single
 * write that stamps createdAt/updatedAt to now. The result is indistinguishable
 * from a manually created routine.
 *
 * @param {string} uid
 * @param {object} routine the source routine to copy
 * @returns {Promise<object>} the saved duplicate (with its new id)
 */
export async function duplicateRoutine(uid, routine) {
  return saveRoutine(uid, createRoutineDuplicate(routine))
}
