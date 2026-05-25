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
