import { startWorkout } from '../../services/workoutSessions'
import { writeActiveWorkout } from '../../utils/activeWorkout'
import { activeWorkoutPath } from './workoutNavigation'

/**
 * The one place a workout is brought into existence.
 *
 * Three layers, each adding exactly one step:
 *
 *   startWorkout()            snapshots the routine into a Firestore document
 *   startActiveWorkout()      + makes it the active workout locally
 *   startWorkoutAndNavigate() + opens it on its canonical route
 *
 * Callers pick the layer they need. Nothing below re-implements a step from a
 * layer above it, so the ordering can only be got right.
 */

/**
 * Create a workout for `routine` and make it the active one.
 *
 * The order is load-bearing, not stylistic. `startWorkout` only writes
 * Firestore; the recovery copy is what RoutineWorkoutContainer resolves before
 * it will mount the workout at all. Navigate before this write lands and the
 * container finds nothing, strips the flag, and drops the user back into the
 * routine editor with a live workout stranded in Firestore.
 *
 * A rejected `startWorkout` propagates with nothing written locally, so a
 * failed start leaves no trace for the recovery banner to pick up.
 *
 * @returns {Promise<object>} the new session
 */
export async function startActiveWorkout(uid, routine) {
  const session = await startWorkout(uid, routine)
  writeActiveWorkout(session)
  return session
}

/**
 * Start a workout and go to it.
 *
 * For callers that navigate by path. The routine route does not use this: it is
 * already on the right path and only needs its own query flag set, which
 * RoutineWorkoutContainer owns (see startRoutineWorkout).
 *
 * `navigate` is injected rather than taken from a hook so this stays a plain
 * function — testable, and usable from any caller that already has one.
 *
 * @returns {Promise<object>} the new session
 */
export async function startWorkoutAndNavigate({ uid, routine, navigate }) {
  const session = await startActiveWorkout(uid, routine)
  navigate(activeWorkoutPath(session))
  return session
}
