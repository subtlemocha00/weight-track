/**
 * Normalize step of the import pipeline.
 *
 * Converts a loosely-typed RawImport into a predictable shape: trimmed string
 * names and integer sets/reps. It does NOT validate — invalid values (0, NaN,
 * empty names) are passed through unchanged for the validator to catch. This
 * keeps each step single-purpose.
 *
 * Non-finite numeric inputs normalize to 0 so the validator reports a clear
 * "must be at least 1" error rather than a confusing NaN.
 */

function toName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toCount(value) {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? n : 0
}

// Optional target weight: empty/blank → null; non-numeric → null. Never errors,
// since Weight is an optional column.
function toWeight(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {import('./importTypes').RawImport} raw
 * @returns {{name: string, days: Array<{name: string, exercises: Array<{name: string, sets: number, reps: number, weight: number|null, notes: string}>}>}}
 */
export function normalizeImport(raw) {
  const days = Array.isArray(raw?.days) ? raw.days : []

  return {
    name: toName(raw?.name),
    days: days.map((day) => ({
      name: toName(day?.name),
      exercises: (Array.isArray(day?.exercises) ? day.exercises : []).map(
        (exercise) => ({
          name: toName(exercise?.name),
          sets: toCount(exercise?.sets),
          reps: toCount(exercise?.reps),
          // Optional columns. Absent on payloads that don't supply them (e.g.
          // the mock), in which case they default to null / '' — preserving
          // prior behavior.
          weight: toWeight(exercise?.weight),
          notes: toName(exercise?.notes)
        })
      )
    }))
  }
}
