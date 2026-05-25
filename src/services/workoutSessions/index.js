import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { createSessionFromRoutine } from '../../features/workoutSessions/sessionFactory'

function sessionDocRef(uid, sessionId) {
  return doc(firestore, 'users', uid, 'workoutSessions', sessionId)
}

export async function getSession(uid, sessionId) {
  const snap = await getDoc(sessionDocRef(uid, sessionId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function saveSession(uid, session) {
  const { id, ...body } = session
  await setDoc(sessionDocRef(uid, id), body)
  return session
}

/**
 * Snapshot a routine into a new in-progress session document, then return the
 * full session so the caller can navigate to /workout/:sessionId.
 */
export async function startWorkout(uid, routine) {
  const session = createSessionFromRoutine(routine)
  await saveSession(uid, session)
  return session
}
