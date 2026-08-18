/**
 * Which set a running rest countdown belongs to.
 *
 * The timer is started by completing a set, and belongs to *that* set — not to
 * whatever set later occupies the same position. Sets carry no id, but a
 * completed one carries the moment it was completed, which is unique per
 * completion and already part of the session. That is the handle used here, so
 * nothing is added to the session to support it.
 *
 * Position alone is not enough: sets can be removed mid-workout, and removing
 * one shifts every set after it down an index.
 *
 * Runtime-only, like the timer itself — pure lookup, no state, nothing stored.
 */

/**
 * @param {Array} sets       the exercise's sets, as currently logged
 * @param {number|null} timestamp  completion time of the set that started the rest
 * @returns {number} its current index, or -1 if it is no longer resting
 */
export function findRestTimerOwner(sets, timestamp) {
  if (!Array.isArray(sets) || timestamp === null || timestamp === undefined) {
    return -1
  }
  // Uncompleting the set clears its timestamp, so the completed check is what
  // ends the rest when the user undoes the set that started it.
  return sets.findIndex((set) => set.completed && set.timestamp === timestamp)
}
