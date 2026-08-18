/**
 * Which copy of a routine the editor should be seeded from.
 *
 * `/routine/:id` loads the routine once and then hands it to whichever editor
 * the route is showing. Workout mode unmounts the routine editor, so coming back
 * out of a workout mounts a fresh one — seeded, by default, from that original
 * load.
 *
 * That is wrong when the workout was started with "Save & start": the routine
 * was written to Firestore after the page loaded, so the loaded copy is now the
 * older version. Re-seeding from it shows the just-saved edits as missing and
 * lets the next Save write the older exercises back over them.
 *
 * The routine a workout was started from is therefore remembered and preferred.
 * Pure resolution — nothing here reads or writes anything.
 */

/**
 * @param {object} loaded    the routine as fetched for this route
 * @param {object|null} startedFrom  the routine a workout was started from, if any
 * @returns {object} the routine to seed the editor with
 */
export function resolveEditorRoutine(loaded, startedFrom) {
  // Only ever prefer it for the routine actually on screen. A remembered copy
  // from a different routine is not a newer version of this one.
  if (startedFrom && loaded && startedFrom.id === loaded.id) return startedFrom
  return loaded
}
