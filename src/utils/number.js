/**
 * Numeric input parsers shared by the set-row components.
 *
 * Both parsers are written for `<input type="number">` values, where the field
 * is a string that may be empty. They return `null` — never NaN and never 0 —
 * for anything that isn't a finite number, so a cleared field round-trips to a
 * stored `null` (rendered as the "—" placeholder) rather than a spurious zero.
 */

/** Parse an integer field (reps, rest seconds). Truncates toward zero. */
export function parseInt10(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

/** Parse a decimal field (weights). Keeps fractional values as entered. */
export function parseFloatNum(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}
