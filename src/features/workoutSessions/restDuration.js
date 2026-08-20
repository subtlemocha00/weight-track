/**
 * How long to rest after a given set.
 *
 * Two sources, and the specific one wins: a rest typed against a set in the
 * routine is a deliberate instruction for that set, so it is used exactly as
 * written. The setting is only a fallback for sets that were left blank — it
 * says what to do when the routine says nothing, not what to do instead of it.
 *
 * A rest of 0 means no rest, wherever it comes from:
 *   - 0 on a set     no timer after that set, even though others get one
 *   - 0 in settings  no timer after any set that has no rest of its own
 *
 * The setting governs the fallback only, so a set carrying its own rest always
 * gets its timer whatever the setting says.
 */

/** Is this a rest the user actually put on the set? */
function hasOwnRest(set) {
  return Number.isFinite(set?.restSeconds) && set.restSeconds >= 0
}

/**
 * Rest for `set` in seconds, or 0 for no rest at all.
 *
 * @param {object} set      session set, which carries the routine's restSeconds
 * @param {object} settings user settings (defaultRestSeconds)
 * @returns {number} seconds to count down; 0 means show no timer
 */
export function resolveRestSeconds(set, settings) {
  if (hasOwnRest(set)) return Math.trunc(set.restSeconds)
  const fallback = settings?.defaultRestSeconds
  return Number.isFinite(fallback) && fallback > 0 ? Math.trunc(fallback) : 0
}
