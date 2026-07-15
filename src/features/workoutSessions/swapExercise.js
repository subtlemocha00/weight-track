/**
 * Replace the exercise-library identity of a session exercise while preserving
 * every value the user has logged. Only the two fields that say *which* library
 * exercise this card represents change:
 *
 *   - exerciseId — the id the workout/history screens resolve back to the full
 *     library exercise (instructions, video, muscles, body part, equipment) at
 *     render time, so changing it swaps all of that metadata automatically.
 *   - name       — the stored display name.
 *
 * Sets, reps, entered weights, completion status, notes, rest values, superset
 * assignment, and exercise order all live on the session exercise and are copied
 * across untouched.
 *
 * Returns a NEW session object; the input is never mutated. Returns the original
 * session unchanged when the index is out of range or the replacement has no id,
 * so a stale or malformed swap can never corrupt an in-progress workout.
 *
 * @param {object} session      The active workout session.
 * @param {number} index        Index of the exercise to replace.
 * @param {object} replacement  Library exercise (built-in or custom) to swap in.
 */
export function swapSessionExercise(session, index, replacement) {
  if (!session || !Array.isArray(session.exercises)) return session
  if (index < 0 || index >= session.exercises.length) return session
  if (!replacement?.id) return session

  const exercises = session.exercises.slice()
  const current = exercises[index]
  if (!current) return session

  exercises[index] = {
    ...current,
    exerciseId: replacement.id,
    name: replacement.name
  }
  return { ...session, exercises }
}
