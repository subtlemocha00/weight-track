/**
 * Which copy of a routine the editor should be seeded from.
 *
 * `/routine/:id` loads the routine once and then hands it to whichever editor
 * the route is showing. Workout mode unmounts the routine editor, so coming back
 * out of a workout mounts a fresh one — seeded, by default, from that original
 * load.
 *
 * That is wrong once the editor has saved: the routine was written to Firestore
 * after the page loaded, so the loaded copy is now the older version. Re-seeding
 * from it shows the saved edits as missing and lets the next Save write the older
 * version back over them. It is reachable from both ways into workout mode —
 * Start saving first ("Save & start"), and Save followed by Resume.
 *
 * The newest saved copy is therefore remembered and preferred. Pure resolution —
 * nothing here reads or writes anything.
 */

/**
 * @param {object} loaded  the routine as fetched for this route
 * @param {object|null} saved  the newest state the editor has persisted, if any
 * @returns {object} the routine to seed the editor with
 */
export function resolveEditorRoutine(loaded, saved) {
  // Only ever prefer it for the routine actually on screen. A remembered copy
  // from a different routine is not a newer version of this one.
  if (saved && loaded && saved.id === loaded.id) return saved
  return loaded
}
