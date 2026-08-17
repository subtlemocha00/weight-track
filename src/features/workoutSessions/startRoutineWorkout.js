import { startWorkout } from '../../services/workoutSessions'
import { readActiveWorkout, writeActiveWorkout } from '../../utils/activeWorkout'

/**
 * Starting a workout from the routine route.
 *
 * Thin composition over the existing start mechanism — `startWorkout` still
 * snapshots the routine and writes the initial Firestore document, unchanged.
 * The one addition is writing the local recovery copy up front.
 *
 * Why that write belongs here: on the /workout/:sessionId path the copy is
 * created a moment later, by SessionEditor's autosave effect when it mounts.
 * The routine route can't wait for that — RoutineWorkoutContainer resolves the
 * session from localStorage to decide whether to mount SessionEditor at all, so
 * the copy has to exist before the URL flag is set. It is the same helper, the
 * same key, and the same session object the editor would write itself.
 */

/**
 * Is there an unfinished workout anywhere? One definition, shared by the gate in
 * the routine editor and the guard below, and reading the same recovery copy the
 * home screen's resume banner uses.
 */
export function hasActiveWorkout() {
  return readActiveWorkout() !== null
}

/**
 * Create a workout for `routine` and make it the active one.
 *
 * Refuses rather than clobbers: if a workout is already in progress this returns
 * null without creating a session or touching the existing recovery copy, since
 * an unfinished workout is only ever discarded deliberately from the home
 * screen. Errors from the Firestore write propagate, having written nothing
 * locally, so the caller can leave the user in the routine editor.
 *
 * @returns {Promise<object|null>} the new session, or null when one is already active
 */
export async function startRoutineWorkout(uid, routine) {
  if (hasActiveWorkout()) return null

  const session = await startWorkout(uid, routine)
  writeActiveWorkout(session)
  return session
}
