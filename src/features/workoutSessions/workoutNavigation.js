/**
 * Where an active workout lives, and where it goes back to.
 *
 * A workout can be mounted from two routes:
 *
 *   canonical  /routine/:routineId?workout=1   (RoutineWorkoutContainer)
 *   legacy     /workout/:sessionId             (WorkoutSessionPage)
 *
 * Both render the same SessionEditor, so the editor cannot hard-code its own
 * destinations any more. The mounting owner picks a navigation set here and
 * hands it down; nothing sniffs the URL to work out where it is.
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

/** The legacy session-id route. Still a working entry point. */
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
 * Navigation for a workout mounted at /workout/:sessionId.
 *
 * Unchanged from before the routes were unified: back goes to the home screen,
 * and a swap round-trips through this same session-id route.
 */
export function legacyWorkoutNavigation(sessionId) {
  return {
    back: '/home',
    backReplace: false,
    swapReturnTo: legacyWorkoutPath(sessionId)
  }
}

/**
 * Navigation for a workout mounted at /routine/:routineId?workout=1.
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
