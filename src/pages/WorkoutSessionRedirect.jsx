import { Navigate, useParams } from 'react-router-dom'
import { readActiveWorkout } from '../utils/activeWorkout'
import { resolveLegacyWorkoutDestination } from '../features/workoutSessions/legacyWorkoutRedirect'

/**
 * Compatibility route for /workout/:sessionId.
 *
 * The workout UI moved to /routine/:routineId?workout=1; this keeps old links
 * and bookmarks working by sending them there. It renders no workout UI of its
 * own and touches no data — one synchronous localStorage read, then a redirect.
 *
 * Redirecting rather than pushing means Back skips the legacy URL instead of
 * landing on it and bouncing forward again.
 */
export function WorkoutSessionRedirect() {
  const { sessionId } = useParams()
  const destination = resolveLegacyWorkoutDestination(sessionId, readActiveWorkout())

  return <Navigate to={destination} replace />
}
