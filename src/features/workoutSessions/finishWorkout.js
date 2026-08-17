import { saveSession } from '../../services/workoutSessions'
import { getRoutine, saveRoutine } from '../../services/routines'
import { clearActiveWorkout } from '../../utils/activeWorkout'
import { applySessionToRoutine } from './applyToRoutine'

/**
 * Finishing a workout, in the order that keeps it recoverable.
 *
 * The rule this module exists to enforce: a workout is never treated as
 * completed — locally or in the crash-recovery copy — until Firestore has
 * acknowledged the write. Everything that discards recovery state happens
 * strictly after `saveSession` resolves.
 */

/**
 * The completed form of a session: the live session exactly as logged, plus the
 * two completion fields. Every other field (id, routineId, routineName,
 * startedAt, exercises, sets, weights, reps, completion timestamps) is carried
 * across untouched, and the input is not mutated.
 */
export function buildCompletedSession(session, completedAt = Date.now()) {
  return {
    ...session,
    status: 'completed',
    completedAt
  }
}

/**
 * Persist the completed session, then drop the local recovery copy.
 *
 * Rejects with the underlying Firestore error if the write fails, having
 * changed nothing: the caller's session stays in progress and the
 * `wt-active-workout` copy stays intact, so the user can retry.
 *
 * Retries are safe. `saveSession` is a `setDoc` against the session's existing
 * client-generated id, so re-running this writes the same document again rather
 * than creating a second one.
 *
 * @returns {Promise<object>} the finalized session that was written
 */
export async function persistFinishedSession(uid, session, completedAt = Date.now()) {
  const finalized = buildCompletedSession(session, completedAt)
  await saveSession(uid, finalized)
  // Reached only when the write succeeded — the workout is now safe in Firestore.
  clearActiveWorkout()
  return finalized
}

/**
 * The opt-in half of finishing: apply a completed session back onto its source
 * routine. Called only when the user answers "Update" to the post-workout
 * prompt; skipping it leaves the routine untouched.
 *
 * Separate from `persistFinishedSession` on purpose — the workout is saved
 * regardless of what the user chooses here, and a failure updating the routine
 * must never be reported as a failure to save the workout.
 *
 * @returns {Promise<boolean>} false when the source routine no longer exists
 */
export async function applyFinishedSessionToRoutine(uid, finalized) {
  const sourceRoutine = await getRoutine(uid, finalized.routineId)
  if (!sourceRoutine) return false
  await saveRoutine(uid, applySessionToRoutine(sourceRoutine, finalized))
  return true
}
