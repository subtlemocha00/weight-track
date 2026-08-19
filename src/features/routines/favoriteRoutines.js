/**
 * Is this routine starred?
 *
 * Strict: only a real `true` counts. Routines saved before favourites existed
 * have no such field, and anything else that ends up there (a string "true"
 * from a hand-edited export, a number, null) is not something to guess about —
 * all of it reads as not-favourite, so the list can never be broken by a bad
 * value in one document.
 */
export function isFavorite(routine) {
  return routine?.favorite === true
}

/**
 * Lift the favourites to the top of an already-ordered routine list.
 *
 * This is a regrouping, not a sort: it takes the list in whatever order it
 * arrives — today that is Firestore's `updatedAt desc` — and splits it in two,
 * favourites then the rest, with each group's incoming order untouched. So
 * last-edit ordering still decides position inside both groups, and starring a
 * routine moves it between groups without disturbing either one.
 *
 * Deliberately not a comparator on a "favourited at" date: when a routine was
 * starred says nothing about how recently it was worked on, and the list is
 * ordered by the latter.
 */
export function orderRoutinesByFavorite(routines) {
  if (!Array.isArray(routines)) return []
  const favorites = routines.filter(isFavorite)
  const rest = routines.filter((routine) => !isFavorite(routine))
  return [...favorites, ...rest]
}
