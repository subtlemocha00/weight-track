import * as XLSX from 'xlsx'
import { MIN_SETS, MAX_SETS, MIN_REPS, MAX_REPS } from './importTypes'

/**
 * XLSX → RawImport adapter.
 *
 * Deterministic only — no fuzzy column matching, no heuristics, no auto-fix.
 * Reads a .xlsx file into the `RawImport` shape
 * ({ name, days: [{ name, exercises: [{ name, sets, reps, weight, notes }] }] }).
 * Everything after that (normalize → validate → resolve → preview → save) is
 * the shared pipeline.
 *
 * Two error tiers (per the Phase 5 brief):
 *
 *   STRUCTURAL (blocking) — unreadable file, wrong type, missing required
 *   columns, or zero valid rows. These THROW so the import screen can show them
 *   before the preview stage; no preview is possible.
 *
 *   ROW-LEVEL (non-blocking) — a single row with a missing Day/Exercise name or
 *   an out-of-range Sets/Reps value. The offending row is SKIPPED (never
 *   silently kept) and reported in the returned `skipped` array with its
 *   spreadsheet row number, so the preview can show exactly what was dropped and
 *   why while still importing the valid rows.
 *
 * Returns `{ raw, skipped }` rather than a bare RawImport.
 */

export const REQUIRED_COLUMNS = ['Day', 'Exercise', 'Sets', 'Reps']
export const OPTIONAL_COLUMNS = ['Weight', 'Notes']

const ACCEPTED_EXTENSION = '.xlsx'

/** Lowercase, trim, and drop any "(optional)"-style parenthetical from a header. */
function headerKey(cell) {
  return String(cell ?? '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
}

function cellAt(row, index) {
  return index >= 0 && index < row.length ? row[index] : ''
}

/** Whole-number coercion that preserves NaN for non-numeric input. */
function toCount(value) {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Deterministic row-level check. Returns the first problem found (as a
 * user-facing reason string), or null when the row is importable. Uses the same
 * set/rep bounds as the validator so the preview reflects exactly what saves.
 */
function rowProblem({ day, exerciseName, sets, reps }) {
  if (!day) return 'Missing Day'
  if (!exerciseName) return 'Missing Exercise name'
  const s = toCount(sets)
  if (!Number.isInteger(s) || s < MIN_SETS || s > MAX_SETS) {
    return `Sets must be a whole number between ${MIN_SETS} and ${MAX_SETS}`
  }
  const r = toCount(reps)
  if (!Number.isInteger(r) || r < MIN_REPS || r > MAX_REPS) {
    return `Reps must be a whole number between ${MIN_REPS} and ${MAX_REPS}`
  }
  return null
}

/**
 * Parse a user-selected .xlsx File into a RawImport.
 *
 * @param {File} file
 * @param {{ fallbackName?: string }} [options] fallbackName seeds the program
 *        name (typically derived from the filename) since spreadsheets carry no
 *        routine-name column.
 * @returns {Promise<{raw: import('./importTypes').RawImport, skipped: Array<{row: number, exercise: string, reason: string}>}>}
 * @throws {Error} with a user-friendly message on any structural problem.
 */
export async function parseXlsxFile(file, { fallbackName = '' } = {}) {
  const filename = file?.name ?? ''
  if (!filename.toLowerCase().endsWith(ACCEPTED_EXTENSION)) {
    throw new Error('Unsupported file type. Please upload a .xlsx spreadsheet.')
  }

  let workbook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    throw new Error('This file could not be read as a valid .xlsx spreadsheet.')
  }

  const firstSheetName = workbook.SheetNames?.[0]
  if (!firstSheetName) {
    throw new Error('The spreadsheet has no sheets.')
  }

  // blankrows: true keeps blank rows as empty arrays so a row's array index
  // stays aligned with its real spreadsheet row number (used in skip reports).
  // We drop the blanks ourselves below.
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: true,
    defval: ''
  })

  // Header row = the first row containing any non-empty cell (deterministic).
  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => String(cell).trim() !== '')
  )
  if (headerRowIndex === -1) {
    throw new Error('The spreadsheet is empty.')
  }

  const keys = rows[headerRowIndex].map(headerKey)
  const colIndex = {}
  for (const col of [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]) {
    colIndex[col] = keys.indexOf(col.toLowerCase())
  }

  const missing = REQUIRED_COLUMNS.filter((col) => colIndex[col] === -1)
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(', ')}. ` +
        `Expected columns: ${REQUIRED_COLUMNS.join(', ')} ` +
        `(${OPTIONAL_COLUMNS.join(' and ')} optional).`
    )
  }

  const parsedRows = []
  const skipped = []

  rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    // 1-based spreadsheet row number, as the user sees it in Excel. The header
    // sits at array index headerRowIndex; data rows follow.
    const rowNumber = headerRowIndex + offset + 2
    const day = String(cellAt(row, colIndex.Day)).trim()
    const exerciseName = String(cellAt(row, colIndex.Exercise)).trim()
    const sets = cellAt(row, colIndex.Sets)
    const reps = cellAt(row, colIndex.Reps)
    const weight = colIndex.Weight >= 0 ? cellAt(row, colIndex.Weight) : ''
    const notes =
      colIndex.Notes >= 0 ? String(cellAt(row, colIndex.Notes)).trim() : ''

    // Fully-empty rows are spacer/padding — silently ignored, not reported.
    const isEmpty =
      !day &&
      !exerciseName &&
      String(sets).trim() === '' &&
      String(reps).trim() === '' &&
      String(weight).trim() === '' &&
      !notes
    if (isEmpty) return

    // A row that carries data but is malformed is SKIPPED and reported, never
    // silently kept and never blocking the rest of the import.
    const problem = rowProblem({ day, exerciseName, sets, reps })
    if (problem) {
      skipped.push({ row: rowNumber, exercise: exerciseName, reason: problem })
      return
    }

    parsedRows.push({ day, exerciseName, sets, reps, weight, notes })
  })

  if (parsedRows.length === 0) {
    const detail =
      skipped.length > 0
        ? ` ${skipped.length} row(s) had problems and were skipped.`
        : ''
    throw new Error(`No valid exercise rows found in the spreadsheet.${detail}`)
  }

  return { raw: groupRowsToRawImport(parsedRows, fallbackName), skipped }
}

/**
 * Group flat parsed rows into a RawImport, one day per distinct Day value
 * (preserving first-seen order). Day grouping is exact on the trimmed string —
 * no normalization beyond trim — so a blank Day produces a blank-named day that
 * the validator will reject, rather than being silently merged or guessed.
 */
function groupRowsToRawImport(parsedRows, fallbackName) {
  const order = []
  const byDay = new Map()

  for (const row of parsedRows) {
    if (!byDay.has(row.day)) {
      byDay.set(row.day, { name: row.day, exercises: [] })
      order.push(row.day)
    }
    byDay.get(row.day).exercises.push({
      name: row.exerciseName,
      sets: row.sets,
      reps: row.reps,
      weight: row.weight,
      notes: row.notes
    })
  }

  return {
    name: fallbackName.trim() || 'Imported Routine',
    days: order.map((day) => byDay.get(day))
  }
}
