import { readActiveWorkout } from '../../utils/activeWorkout'
import { startActiveWorkout } from './startActiveWorkout'

/**
 * Starting a workout from the routine route.
 *
 * The start itself lives in startActiveWorkout — shared with the home screen so
 * the Firestore-then-recovery-copy ordering has a single implementation. What
 * this module adds is the routine route's gate.
 *
 * It deliberately does not navigate. The route is already correct; only the
 * query flag needs setting, and RoutineWorkoutContainer owns that so there
 * stays exactly one path into workout mode.
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

  return startActiveWorkout(uid, routine)
}
