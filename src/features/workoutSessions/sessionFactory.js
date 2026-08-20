import { newId } from '../../utils/id'
import {
  DEFAULT_SETS_PER_EXERCISE,
  DEFAULT_REPS,
  DEFAULT_UNIT
} from '../routines/routineFactory'

/**
 * A fresh, uncompleted set for a session exercise. Mirrors the set shape used
 * by `createSessionFromRoutine` (reps/weight/unit/completed/timestamp).
 */
export function createSessionSet() {
  return {
    reps: DEFAULT_REPS,
    weight: null,
    unit: DEFAULT_UNIT,
    // No rest of its own, so the rest timer falls back to the user's setting
    // (see restDuration). Sets seeded from a routine carry its value instead.
    restSeconds: null,
    completed: false,
    timestamp: null
  }
}

/**
 * A set added part-way through a workout, carried over from the one before it.
 *
 * Session sets are normally seeded from the routine, so reps and weight already
 * arrive pre-filled — an added set follows the same convention by repeating the
 * previous set rather than blanking out. Copying `unit` is what actually
 * matters: the unit toggle is per-exercise and reads every set, so a set left
 * on the default would leave a kg exercise showing neither unit selected.
 *
 * Completion never carries over — an added set has not been done yet.
 */
export function createFollowOnSet(previousSet) {
  if (!previousSet) return createSessionSet()
  return {
    reps: previousSet.reps ?? DEFAULT_REPS,
    weight: previousSet.weight ?? null,
    unit: previousSet.unit ?? DEFAULT_UNIT,
    // Carried for the same reason as `unit`: an extra set of an exercise the
    // routine gives a 45s rest should rest for 45s too, not drop to the global
    // default part-way down the card.
    restSeconds: previousSet.restSeconds ?? null,
    completed: false,
    timestamp: null
  }
}

/**
 * Build a session exercise from a library exercise object (built-in or custom)
 * for an exercise added mid-workout. Starts with the same default set count as
 * a routine exercise, all uncompleted. This only ever modifies the active
 * session — the source routine is untouched.
 */
export function createSessionExercise(exercise, order) {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    order,
    sets: Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, createSessionSet),
    notes: '',
    supersetId: null
  }
}

/**
 * Snapshot a routine into a fresh in-progress workout session.
 *
 * The snapshot is what the workout starts from, not a cap on it: exercises and
 * sets can both be added or removed during the session. Every such edit stays
 * on the session — the routine only changes if the user opts in after
 * finishing.
 */
export function createSessionFromRoutine(routine) {
  return {
    id: newId(),
    routineId: routine.id,
    routineName: routine.name,
    startedAt: Date.now(),
    completedAt: null,
    status: 'in_progress',
    // Pause bookkeeping, read by workoutClock: `pausedAt` is set while the
    // clock is stopped, `pausedMs` is the time already banked from earlier
    // pauses. A fresh workout is running and has banked nothing.
    pausedAt: null,
    pausedMs: 0,
    exercises: routine.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: index,
      sets: exercise.sets.map((set) => ({
        reps: set.reps ?? 0,
        weight: set.targetWeight ?? null,
        unit: set.unit ?? 'lb',
        // The routine's per-set rest comes along with the snapshot — it is what
        // the rest timer counts down during the workout, ahead of the global
        // setting. Blank stays blank, which is what defers to the setting.
        restSeconds: set.restSeconds ?? null,
        completed: false,
        timestamp: null
      })),
      notes: exercise.notes ?? '',
      supersetId: exercise.supersetId ?? null
    }))
  }
}
