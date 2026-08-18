import { routineWorkoutPath } from './workoutNavigation'

/**
 * Where an old /workout/:sessionId link should land.
 *
 * The workout UI now lives only at /routine/:routineId?workout=1, so the old
 * route is kept purely so existing links and bookmarks still work. Pure
 * resolution: this reads nothing, writes nothing, and never creates a session.
 */

/**
 * Where a legacy link goes when it cannot be resolved to a live workout.
 *
 * The home screen is the app's existing recovery surface — if a different
 * workout is in progress its banner offers Resume/Discard, and if none is it
 * simply shows the routine list. Nothing is invented and nothing is lost.
 */
export const LEGACY_FALLBACK_PATH = '/home'

/**
 * Resolve a legacy workout URL against the current recovery copy.
 *
 * Only the live workout can be reopened, and only under its own id. Firestore
 * is deliberately not consulted: for an in-progress session it holds just the
 * start-time snapshot, so a link opened where the recovery copy does not exist
 * has no logged data to show. Falling back is honest; fetching a stale template
 * and presenting it as the workout would not be.
 *
 * Every rejection — nothing saved, malformed data, a finished workout, a link
 * to a different session, or a session with no routine to return to — resolves
 * to the same safe destination rather than a guessed route.
 *
 * @param {string} sessionId       id from the legacy URL
 * @param {object|null} activeSession  current recovery copy, if any
 * @returns {string} the path to redirect to
 */
export function resolveLegacyWorkoutDestination(sessionId, activeSession) {
  if (!sessionId || !activeSession) return LEGACY_FALLBACK_PATH
  // A mismatch means the link is for some other workout. Never redirect to the
  // active workout's routine on the strength of an unrelated session id.
  if (activeSession.id !== sessionId) return LEGACY_FALLBACK_PATH
  if (activeSession.status === 'completed') return LEGACY_FALLBACK_PATH
  // No routine, no canonical route — the destination is built from this id.
  if (!activeSession.routineId) return LEGACY_FALLBACK_PATH

  return routineWorkoutPath(activeSession.routineId)
}
