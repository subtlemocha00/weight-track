import exercises from '../../data/exercises.json'

let byIdIndex = null
function getByIdIndex() {
  if (byIdIndex) return byIdIndex
  byIdIndex = new Map()
  for (const ex of exercises) byIdIndex.set(ex.id, ex)
  return byIdIndex
}

// Maps a normalized (trim + lowercase) name to its built-in exercise, built
// once on first lookup. Powers exact-match name resolution. If two built-in
// names normalize identically, the first wins — built-in data is the source of
// truth and is not expected to contain such collisions.
let byNameIndex = null
function getByNameIndex() {
  if (byNameIndex) return byNameIndex
  byNameIndex = new Map()
  for (const ex of exercises) {
    const key = normalizeExerciseName(ex.name)
    if (key && !byNameIndex.has(key)) byNameIndex.set(key, ex)
  }
  return byNameIndex
}

let filterOptionsCache = null

/**
 * Canonical name normalization used everywhere a name is matched: lowercase
 * and trim only. Intentionally NOT fuzzy — "Bench Press" must not match
 * "Barbell Bench Press". Returns '' for non-strings.
 */
export function normalizeExerciseName(name) {
  if (typeof name !== 'string') return ''
  return name.trim().toLowerCase()
}

export function getAllExercises() {
  return exercises
}

export function getExerciseById(id) {
  if (!id) return null
  return getByIdIndex().get(id) ?? null
}

export function searchExercises(query) {
  if (!query) return exercises
  const q = String(query).trim().toLowerCase()
  if (!q) return exercises
  return exercises.filter((ex) => ex.name.toLowerCase().includes(q))
}

// Shared filter predicate. `q` is already lowercased/trimmed. Works for both
// built-in and custom exercises: custom exercises have null bodyPart/equipment
// and empty muscle arrays, so an active metadata filter naturally excludes them
// (e.g. null !== 'chest'), while a plain name search still matches them.
function matchesFilters(ex, { q, bodyPart, muscle, equipment, difficulty }) {
  if (q && !ex.name.toLowerCase().includes(q)) return false
  if (bodyPart && ex.bodyPart !== bodyPart) return false
  if (equipment && ex.equipment !== equipment) return false
  if (difficulty && ex.difficulty !== difficulty) return false
  if (muscle) {
    const hit =
      ex.targetMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle)
    if (!hit) return false
  }
  return true
}

function hasNoFilters({ query, bodyPart, muscle, equipment, difficulty }) {
  return !query && !bodyPart && !muscle && !equipment && !difficulty
}

export function filterExercises(filters = {}) {
  if (hasNoFilters(filters)) return exercises
  const q = filters.query ? String(filters.query).trim().toLowerCase() : ''
  return exercises.filter((ex) => matchesFilters(ex, { ...filters, q }))
}

/**
 * Filter across both the built-in library and the supplied custom exercises,
 * returning a single merged list. The combined result is sorted by name so
 * custom exercises appear in their natural alphabetical position rather than
 * tacked on at the end. Custom exercises are passed in (already loaded) so
 * searching/filtering never triggers a Firestore read.
 */
export function filterAllExercises(filters = {}, customExercises = []) {
  if (!Array.isArray(customExercises) || customExercises.length === 0) {
    return filterExercises(filters)
  }

  const list = exercises.concat(customExercises)
  const q = filters.query ? String(filters.query).trim().toLowerCase() : ''
  const filtered = hasNoFilters(filters)
    ? list
    : list.filter((ex) => matchesFilters(ex, { ...filters, q }))

  return filtered.slice().sort((a, b) => a.name.localeCompare(b.name))
}

export function getFilterOptions() {
  if (filterOptionsCache) return filterOptionsCache

  const bodyParts = new Set()
  const muscles = new Set()
  const equipmentValues = new Set()
  const difficulties = new Set()

  for (const ex of exercises) {
    bodyParts.add(ex.bodyPart)
    ex.targetMuscles.forEach((m) => muscles.add(m))
    ex.secondaryMuscles.forEach((m) => muscles.add(m))
    equipmentValues.add(ex.equipment)
    if (ex.difficulty) difficulties.add(ex.difficulty)
  }

  const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced']

  filterOptionsCache = {
    bodyParts: [...bodyParts].sort(),
    muscles: [...muscles].sort(),
    equipment: [...equipmentValues].sort(),
    difficulties: DIFFICULTY_ORDER.filter((d) => difficulties.has(d))
  }

  return filterOptionsCache
}

/**
 * Filter options that include values contributed by the user's custom
 * exercises, so any body part / muscle / equipment a custom exercise uses is
 * selectable in the filter dropdowns. Difficulty is built-in only (custom
 * exercises carry no difficulty). The built-in base is cached; merging is cheap
 * and done per call.
 */
export function getCombinedFilterOptions(customExercises = []) {
  const base = getFilterOptions()
  if (!Array.isArray(customExercises) || customExercises.length === 0) {
    return base
  }

  const bodyParts = new Set(base.bodyParts)
  const muscles = new Set(base.muscles)
  const equipment = new Set(base.equipment)

  for (const ex of customExercises) {
    if (ex.bodyPart) bodyParts.add(ex.bodyPart)
    ;(ex.targetMuscles || []).forEach((m) => muscles.add(m))
    ;(ex.secondaryMuscles || []).forEach((m) => muscles.add(m))
    if (ex.equipment) equipment.add(ex.equipment)
  }

  return {
    bodyParts: [...bodyParts].sort(),
    muscles: [...muscles].sort(),
    equipment: [...equipment].sort(),
    difficulties: base.difficulties
  }
}

// ---------------------------------------------------------------------------
// Cross-source resolution + lookup
//
// The app now has two exercise sources: the static built-in library above and
// each user's private custom library (Firestore /users/{uid}/customExercises).
// The functions below resolve/search across both. They accept an already-loaded
// array of custom exercises rather than a uid so callers control fetching —
// a future bulk import can load the custom list once and resolve many names
// against it without a Firestore round-trip per name.
// ---------------------------------------------------------------------------

/**
 * Resolve an exercise by name using exact, case-insensitive, whitespace-trimmed
 * matching. Built-in library is checked first, then the user's custom library.
 * No fuzzy matching is performed.
 *
 * @param {string} name
 * @param {Array} [customExercises] User's custom exercises (default []).
 * @returns {{found: true, source: 'builtin'|'custom', exercise: object} | {found: false}}
 */
export function resolveExercise(name, customExercises = []) {
  const key = normalizeExerciseName(name)
  if (!key) return { found: false }

  const builtin = getByNameIndex().get(key)
  if (builtin) return { found: true, source: 'builtin', exercise: builtin }

  if (Array.isArray(customExercises)) {
    const custom = customExercises.find(
      (ex) => normalizeExerciseName(ex?.name) === key
    )
    if (custom) return { found: true, source: 'custom', exercise: custom }
  }

  return { found: false }
}

/**
 * Look up an exercise by its id across both sources (built-in first, then the
 * supplied custom list). Useful for resolving exerciseIds stored on routines or
 * sessions back to a full exercise object.
 */
export function resolveExerciseById(id, customExercises = []) {
  if (!id) return null
  const builtin = getByIdIndex().get(id)
  if (builtin) return builtin
  if (Array.isArray(customExercises)) {
    return customExercises.find((ex) => ex?.id === id) ?? null
  }
  return null
}

/**
 * Substring name search across built-in + custom exercises. Mirrors
 * `searchExercises` but includes the user's custom library. Built-in results
 * come first, preserving the built-in dataset's existing ordering.
 */
export function searchAllExercises(query, customExercises = []) {
  const builtin = searchExercises(query)
  const custom = Array.isArray(customExercises) ? customExercises : []

  if (!query) return [...builtin, ...custom]
  const q = String(query).trim().toLowerCase()
  if (!q) return [...builtin, ...custom]

  const matchedCustom = custom.filter((ex) =>
    String(ex?.name ?? '').toLowerCase().includes(q)
  )
  return [...builtin, ...matchedCustom]
}
