/**
 * Superset assignment model.
 *
 * A superset is identified on each exercise by a numeric `supersetId`:
 *   null → not in a superset
 *   1    → first superset  (labelled "A" by the UI)
 *   2    → second superset ("B")
 *   …
 *
 * Ids are always kept sequential and gap-free (1, 2, 3, …) across an exercise
 * list. Display labels and colors are derived from the id by the UI — the
 * stored data never contains "Superset A" style strings.
 *
 * These helpers are pure and shared by both the routine editor and the active
 * workout session editor so assignment behaves identically in both places.
 */

// Ordered synthwave palette (from global.css). Superset 1 → first color, etc.
// The primary --neon-green is reserved as the app's action accent, so it sits
// last to reduce confusion with completion/finish UI.
const SUPERSET_COLORS = [
  'var(--neon-blue)',
  'var(--neon-pink)',
  'var(--neon-purple)',
  'var(--neon-orange)',
  'var(--neon-green)'
]

/** A valid superset id is a positive integer; everything else means "none". */
function toSupersetId(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null
}

/**
 * Color token for a superset id, cycling through the palette when there are
 * more supersets than colors. Returns null for "no superset".
 */
export function supersetColor(id) {
  const valid = toSupersetId(id)
  if (valid === null) return null
  return SUPERSET_COLORS[(valid - 1) % SUPERSET_COLORS.length]
}

/**
 * Display letter for a superset id: 1 → "A", 2 → "B", … 26 → "Z", 27 → "AA".
 * Returns '' for "no superset".
 */
export function supersetLetter(id) {
  let n = toSupersetId(id)
  if (n === null) return ''
  let label = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/** Full display label, e.g. "Superset A". */
export function supersetLabel(id) {
  const letter = supersetLetter(id)
  return letter ? `Superset ${letter}` : ''
}

/** Count of distinct supersets in use (assumes a normalized list). */
export function getSupersetCount(exercises) {
  const seen = new Set()
  for (const ex of exercises ?? []) {
    const id = toSupersetId(ex?.supersetId)
    if (id !== null) seen.add(id)
  }
  return seen.size
}

/**
 * Renumber superset ids so the distinct values map to 1, 2, 3, … in ascending
 * order — keeping them sequential with no gaps. Removing the lowest superset
 * shifts the rest down (B→A, C→B). Idempotent for already-sequential input;
 * returns the original array reference when nothing changes.
 */
export function normalizeSupersets(exercises) {
  const list = Array.isArray(exercises) ? exercises : []

  const distinct = [
    ...new Set(list.map((ex) => toSupersetId(ex?.supersetId)).filter((id) => id !== null))
  ].sort((a, b) => a - b)

  const remap = new Map(distinct.map((id, i) => [id, i + 1]))

  let changed = false
  const next = list.map((ex) => {
    const current = toSupersetId(ex?.supersetId)
    const mapped = current === null ? null : remap.get(current)
    if (mapped === ex?.supersetId) return ex
    changed = true
    return { ...ex, supersetId: mapped }
  })

  return changed ? next : exercises
}

/**
 * Toggle/assign superset slot `targetId` to the exercise at `index`:
 *   - clicking the slot the exercise already has  → unassign (null)
 *   - clicking a different slot                    → reassign (latest wins)
 * The result is always normalized (sequential, gap-free). Returns the original
 * array reference when nothing changes.
 */
export function assignSuperset(exercises, index, targetId) {
  const list = Array.isArray(exercises) ? exercises : []
  const target = list[index]
  if (!target) return exercises

  const slot = toSupersetId(targetId)
  if (slot === null) return exercises

  const current = toSupersetId(target.supersetId)
  const nextId = current === slot ? null : slot
  if (nextId === current) return exercises

  const next = list.map((ex, i) =>
    i === index ? { ...ex, supersetId: nextId } : ex
  )
  return normalizeSupersets(next)
}
