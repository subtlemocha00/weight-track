/**
 * Single-routine JSON export (v1) — a complete, deterministic snapshot of a
 * routine's structure for backup / future re-import.
 *
 * The app's internal routine is one template with a flat `exercises` array, each
 * exercise holding a `sets[]` array. The export format is the import-shaped
 * view: `routine.days[]` where each exercise is collapsed to scalar
 * sets/reps/weight/rest. A single routine maps to exactly one day (day name =
 * routine name), which is the precise inverse of how the importer expands one
 * spreadsheet "Day" into one routine — so an export can round-trip back later.
 *
 * Pure and side-effect-free aside from `downloadRoutineExport` (Blob download).
 * No Firestore reads, no Date.now(), no sorting — identical routine state always
 * produces byte-identical JSON.
 */

export const EXPORT_FORMAT = 'weighttrack-routine'
export const EXPORT_VERSION = 1

/** Finite number, or 0 — for required scalar fields (sets, reps). */
function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Finite number, or null — for optional fields (weight, rest, timestamps). */
function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Collapse one internal exercise into the flat export shape. The set count is
 * the array length; reps/weight/rest are taken from the first set (the importer
 * builds every set identically, so the first set is the representative value).
 */
function serializeExercise(exercise) {
  const ex = exercise && typeof exercise === 'object' ? exercise : {}
  const sets = Array.isArray(ex.sets) ? ex.sets : []
  const first = sets[0] && typeof sets[0] === 'object' ? sets[0] : {}

  return {
    exerciseId: ex.exerciseId ?? null,
    exerciseName: typeof ex.name === 'string' ? ex.name : '',
    sets: sets.length,
    reps: toNumber(first.reps),
    weight: toNullableNumber(first.targetWeight),
    notes: typeof ex.notes === 'string' ? ex.notes : '',
    rest: toNullableNumber(first.restSeconds)
  }
}

/**
 * Serialize a routine into the v1 export object. Tolerant of malformed input
 * (missing/!array exercises → []), never includes Firestore doc ids, workout
 * history/sessions, settings, or analytics — only routine structure + the
 * routine-level created/updated timestamps.
 *
 * @param {object} routine internal routine (as stored/edited in the app)
 * @returns {object} the export payload
 */
export function serializeRoutineExport(routine) {
  const source = routine && typeof routine === 'object' ? routine : {}
  const name = typeof source.name === 'string' ? source.name : ''
  const exercises = Array.isArray(source.exercises) ? source.exercises : []

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    routine: {
      name,
      days: [
        {
          name,
          exercises: exercises.map(serializeExercise)
        }
      ],
      createdAt: toNullableNumber(source.createdAt),
      updatedAt: toNullableNumber(source.updatedAt)
    }
  }
}

/**
 * Build the download filename: weighttrack_[slug]_export.json
 * Lowercase the routine name, collapse whitespace to underscores, and drop any
 * character outside [a-z0-9_]. Empty names fall back to "routine".
 */
export function buildExportFilename(name) {
  const slug = (typeof name === 'string' ? name : '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return `weighttrack_${slug || 'routine'}_export.json`
}

/**
 * Serialize a routine and trigger an immediate browser download via the Blob
 * API. Synchronous from the user's perspective; nothing is uploaded or stored.
 * Returns the export payload (handy for tests/callers).
 *
 * @param {object} routine
 * @returns {object} the export payload that was downloaded
 */
export function downloadRoutineExport(routine) {
  const payload = serializeRoutineExport(routine)
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildExportFilename(routine?.name)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return payload
}
