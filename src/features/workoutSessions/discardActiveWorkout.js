import { clearActiveWorkout } from '../../utils/activeWorkout'
import { markSessionAbandoned } from '../../services/workoutSessions'

/**
 * Throw away the workout in progress.
 *
 * The local recovery copy goes first and synchronously: once it is gone the
 * workout is unresumable everywhere, so a failed or slow Firestore write can
 * never leave a discarded workout still offering to resume. Marking the
 * orphaned document abandoned is bookkeeping, so it is fire-and-forget — a
 * discard must work offline.
 *
 * Callers decide what happens afterwards (stay, navigate, re-render); this only
 * ends the workout. It is the single definition of what "discard" means, shared
 * by the home screen's recovery banner, the workout header's Back prompt and the
 * routine page's Discard button.
 */
export function discardActiveWorkout(uid, sessionId) {
  clearActiveWorkout()
  if (uid && sessionId) {
    markSessionAbandoned(uid, sessionId).catch(() => {})
  }
}
