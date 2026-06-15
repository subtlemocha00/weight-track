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
