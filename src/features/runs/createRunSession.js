import { newId } from '../../utils/id'

/**
 * Build a completed run session document.
 * Stored in the same workoutSessions collection as regular workouts.
 * type: "run" distinguishes it in history and detail views.
 */
export function createRunSession({ distance, duration, unit, environment, notes }) {
  const now = Date.now()
  return {
    id: newId(),
    type: 'run',
    startedAt: now,
    completedAt: now,
    status: 'completed',
    runData: {
      distance,
      duration,
      unit,
      environment,
      notes: notes || null
    }
  }
}
