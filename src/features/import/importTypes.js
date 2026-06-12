/**
 * Shared type contracts + limits for the routine import pipeline.
 *
 * The pipeline is method-agnostic: any future parser (XLSX, CSV, JSON, …) only
 * has to emit a `RawImport` object. Everything downstream — normalize, validate,
 * resolve, preview, save — is shared and lives in this folder.
 *
 *   RawImport → normalizeImport → NormalizedImport
 *             → validateImport  → ValidationResult
 *             → resolveImport   → ResolvedImport
 *             → buildRoutines   → Routine[]  (existing routine schema)
 *             → saveRoutine     → Firestore
 *
 * Types are documented with JSDoc rather than enforced (JavaScript-only project).
 *
 * @typedef {Object} RawImportExercise
 * @property {string} name
 * @property {number|string} sets   Raw set count (parsers may emit strings).
 * @property {number|string} reps   Raw rep count.
 *
 * @typedef {Object} RawImportDay
 * @property {string} name                     Workout day name, e.g. "Push Day".
 * @property {RawImportExercise[]} exercises
 *
 * @typedef {Object} RawImport
 * @property {string} name              Program/routine name.
 * @property {RawImportDay[]} days
 *
 * NormalizedImport mirrors RawImport but with trimmed strings and numeric
 * sets/reps. ResolvedImport adds a `resolution` field to each exercise.
 *
 * @typedef {Object} ResolvedExercise
 * @property {string} name
 * @property {number} sets
 * @property {number} reps
 * @property {{found: boolean, source?: 'builtin'|'custom', exercise?: Object}} resolution
 *
 * @typedef {Object} ValidationIssue
 * @property {string} path      Human-readable location, e.g. "Push Day › Bench Press".
 * @property {string} message
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {ValidationIssue[]} errors
 * @property {ValidationIssue[]} warnings
 */

// Bounds used by the validator. Kept deliberately wide — the goal is to reject
// nonsense (0, negative, absurd), not to enforce programming opinions.
export const MIN_SETS = 1
export const MAX_SETS = 20
export const MIN_REPS = 1
export const MAX_REPS = 100

// Resolution source labels reused by the preview UI.
export const RESOLUTION = {
  BUILTIN: 'builtin',
  CUSTOM: 'custom',
  NOT_FOUND: 'not_found'
}
