/**
 * Which workout control the routine editor offers.
 *
 * A routine page shows exactly one workout action, never two:
 *
 *   'start'   no workout of this routine's is running — offer to begin one
 *   'resume'  this routine owns the live workout — offer to go back into it
 *   'none'    the routine isn't startable at all (a routine not yet saved)
 *
 * Start and Resume are mutually exclusive on purpose. Once this routine owns a
 * live workout, Start must not remain on screen as an alternative: the active
 * workout gate would refuse it anyway, and offering it suggests a second
 * workout could be created.
 *
 * Ownership is decided by resolveActiveWorkoutForRoutine, which is also what
 * RoutineWorkoutContainer uses to mount the workout — so the button can only
 * appear when pressing it will actually resolve to a session. A workout
 * belonging to a *different* routine is not ownership: that page keeps its
 * ordinary (blocked) Start, and never offers a way into another routine's
 * workout.
 */

/**
 * @param {boolean} workoutActionsAvailable can this routine run a workout at all
 * @param {boolean} ownsActiveWorkout       does the live workout belong to it
 * @returns {'none'|'resume'|'start'}
 */
export function resolveWorkoutControl({ workoutActionsAvailable, ownsActiveWorkout }) {
  if (!workoutActionsAvailable) return 'none'
  return ownsActiveWorkout ? 'resume' : 'start'
}
