/**
 * Where an active workout lives, and where it goes back to.
 *
 * A workout is shown at /routine/:routineId?workout=1, and nowhere else, so
 * every destination below is derived from a routine id.
 *
 * Pure string building, no router imports — so the destinations are testable
 * on their own.
 */

/**
 * The flag RoutineWorkoutContainer reads to decide whether workout mode was
 * asked for. Kept next to the path builders so the two never drift: the
 * container looks for exactly `workout` === `1`.
 */
export const WORKOUT_PARAM = 'workout'
export const WORKOUT_PARAM_VALUE = '1'

/** The routine template editor. */
export function routineEditPath(routineId) {
  return `/routine/${routineId}`
}

/** The canonical active-workout route for a routine. */
export function routineWorkoutPath(routineId) {
  return `${routineEditPath(routineId)}?${WORKOUT_PARAM}=${WORKOUT_PARAM_VALUE}`
}

/**
 * Where to send someone to open `session`.
 *
 * The canonical route is the only workout destination, and building it requires
 * the routine the session came from. A session without one cannot be addressed
 * at all now that there is no session-id route, so it resolves to the home
 * screen — the app's existing recovery surface, where an unfinished workout can
 * be resumed or discarded. Nothing is invented: never `/routine/undefined`.
 *
 * Unreachable in practice. Every writer of the recovery copy carries the
 * routineId through, so this is the floor under a corrupt or hand-edited value.
 */
export function activeWorkoutPath(session) {
  if (session?.routineId) return routineWorkoutPath(session.routineId)
  return '/home'
}

/**
 * Where a running workout's Back and swap-return go.
 *
 * Back drops the flag, which leaves the routine editor showing — the workout is
 * still in progress and still resumable. It replaces rather than pushes, so the
 * stack does not gain an entry whose only difference is the flag; browser Back
 * then leaves the routine altogether instead of re-entering the workout.
 */
export function routineWorkoutNavigation(routineId) {
  return {
    back: routineEditPath(routineId),
    backReplace: true,
    swapReturnTo: routineWorkoutPath(routineId)
  }
}
