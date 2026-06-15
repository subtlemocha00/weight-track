import { newId } from '../../utils/id'

export const DEFAULT_UNIT = 'lb'
export const DEFAULT_SETS_PER_EXERCISE = 3
export const DEFAULT_REPS = 8

export function createBlankRoutine() {
  const now = Date.now()
  return {
    id: newId(),
    name: '',
    createdAt: now,
    updatedAt: now,
    exercises: []
  }
}

export function createBlankSet() {
  return {
    reps: DEFAULT_REPS,
    targetWeight: null,
    unit: DEFAULT_UNIT,
    restSeconds: null
  }
}

export function createRoutineExercise(exercise, order) {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    order,
    sets: Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, createBlankSet),
    notes: '',
    supersetId: null
  }
}

/** Deep clone of plain JSON-serializable data with no shared references. */
function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

/**
 * Deterministic copy-name generator.
 *
 *   "Push Day"          → "Push Day (Copy)"
 *   "Push Day (Copy)"   → "Push Day (Copy 2)"
 *   "Push Day (Copy 2)" → "Push Day (Copy 3)"
 *
 * Derived purely from the source name (no list scan): a bare "(Copy)" is copy 1,
 * so the next is "(Copy 2)", and "(Copy N)" increments to "(Copy N+1)".
 */
export function nextCopyName(name) {
  const base = (typeof name === 'string' ? name : '').trim() || 'Routine'
  const match = base.match(/^(.*?) \(Copy(?: (\d+))?\)$/)
  if (!match) return `${base} (Copy)`
  const stem = match[1]
  const n = match[2] ? parseInt(match[2], 10) : 1
  return `${stem} (Copy ${n + 1})`
}

/**
 * Build a brand-new routine that is a structural duplicate of `routine`.
 *
 * This is a raw clone — it does NOT re-run exercise resolution or validation. It
 * deep-clones everything (so nested sets/exercises share no references with the
 * original), keeps all routine- and exercise-level data (names, sets/reps,
 * notes, rest time, supersets, units), and strips identity/history fields so the
 * copy is a fresh, independent routine:
 *   - new id (never the original's)
 *   - createdAt/updatedAt omitted → stamped to now by saveRoutine
 *   - any completion marker (e.g. lastCompleted) removed
 *
 * Workout history/sessions live in their own collection and are never touched.
 * Tolerant of malformed input (missing/!array exercises → []).
 */
export function createRoutineDuplicate(routine) {
  const clone = deepClone(routine && typeof routine === 'object' ? routine : {})

  delete clone.id
  delete clone.createdAt
  delete clone.updatedAt
  delete clone.lastCompleted
  delete clone.lastCompletedAt

  clone.id = newId()
  clone.name = nextCopyName(routine?.name)
  if (!Array.isArray(clone.exercises)) clone.exercises = []

  return clone
}
