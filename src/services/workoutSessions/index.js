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
import { createSessionFromRoutine } from '../../features/workoutSessions/sessionFactory'

function sessionsCollection(uid) {
  return collection(firestore, 'users', uid, 'workoutSessions')
}

function sessionDocRef(uid, sessionId) {
  return doc(firestore, 'users', uid, 'workoutSessions', sessionId)
}

export async function getSession(uid, sessionId) {
  const snap = await getDoc(sessionDocRef(uid, sessionId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * List completed workout sessions, sorted by completion time.
 *
 * In-progress sessions are filtered out client-side so the same single-field
 * orderBy works without requiring a composite Firestore index.
 */
export async function listCompletedSessions(uid, { sort = 'desc' } = {}) {
  const snap = await getDocs(
    query(sessionsCollection(uid), orderBy('startedAt', 'desc'))
  )
  const sessions = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.status === 'completed' && s.completedAt)

  sessions.sort((a, b) =>
    sort === 'asc' ? a.completedAt - b.completedAt : b.completedAt - a.completedAt
  )
  return sessions
}

export async function saveSession(uid, session) {
  const { id, ...body } = session
  await setDoc(sessionDocRef(uid, id), body)
  return session
}

/**
 * Apply a partial edit to a single existing session document.
 *
 * Only the provided fields are written — no other session, routine, or template
 * is touched. Used by the history edit flow to correct logged workouts/runs.
 */
export async function updateSession(uid, sessionId, fields) {
  await updateDoc(sessionDocRef(uid, sessionId), fields)
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

export async function deleteSession(uid, sessionId) {
  await deleteDoc(sessionDocRef(uid, sessionId))
}

/**
 * Mark an abandoned in-progress session so it no longer appears as active.
 * Fire-and-forget safe — errors are suppressed by the caller.
 */
export async function markSessionAbandoned(uid, sessionId) {
  try {
    await updateDoc(sessionDocRef(uid, sessionId), { status: 'abandoned' })
  } catch {
    // Ignore — doc may not exist or user may be offline
  }
}
