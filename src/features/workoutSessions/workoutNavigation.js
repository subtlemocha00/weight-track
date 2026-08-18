/**
 * Where an active workout lives, and where it goes back to.
 *
 * A workout is shown at /routine/:routineId?workout=1, and nowhere else.
 * /workout/:sessionId still exists, but only to redirect into that route, so
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

/** The legacy session-id route. Still resolves — as a redirect. */
export function legacyWorkoutPath(sessionId) {
  return `/workout/${sessionId}`
}

/**
 * Where to send someone to open `session`.
 *
 * Prefers the canonical route, which needs the routine the session came from.
 * A session without a routineId can only be addressed by its own id, so it
 * falls back to the legacy route rather than building `/routine/undefined`.
 */
export function activeWorkoutPath(session) {
  if (session?.routineId) return routineWorkoutPath(session.routineId)
  return legacyWorkoutPath(session?.id)
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
