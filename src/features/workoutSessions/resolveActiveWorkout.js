import { readActiveWorkout } from '../../utils/activeWorkout'

/**
 * Finding the in-progress workout that belongs to a given routine.
 *
 * Source of truth is the same `wt-active-workout` recovery copy that
 * /workout/:sessionId reads first and the home screen's resume banner is built
 * on — there is deliberately no second lookup. Firestore holds only the
 * start-time snapshot of an in-progress session and offers no by-routine query
 * for one, so localStorage is the only place a live workout exists. That also
 * makes resolution synchronous: no fetch, no loading state, no async race.
 *
 * Everything here is read-only. Nothing writes, clears, or creates a session.
 */

/**
 * Is this recovery copy usable as the live workout for `routineId`?
 *
 * The routine match is what stops routine B's page from adopting routine A's
 * workout. The completion check mirrors the rule /workout/:sessionId already
 * applies to the same data, so both entry points accept exactly the same
 * sessions.
 */
export function isActiveWorkoutForRoutine(session, routineId) {
  if (!session || !routineId) return false
  if (!session.id) return false
  if (session.status === 'completed') return false
  return session.routineId === routineId
}

/**
 * The active workout for `routineId`, or null when there isn't one.
 *
 * Returning null covers every non-match — nothing saved, malformed data, a
 * finished session, or a workout belonging to a different routine. A workout
 * for another routine is left exactly as it is: it is that routine's legitimate
 * active session.
 *
 * @returns {object|null} the live session, or null to stay in edit mode
 */
export function resolveActiveWorkoutForRoutine(routineId) {
  const saved = readActiveWorkout()
  return isActiveWorkoutForRoutine(saved, routineId) ? saved : null
}
