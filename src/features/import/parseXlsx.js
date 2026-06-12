import * as XLSX from 'xlsx'

/**
 * XLSX → RawImport adapter.
 *
 * Deterministic only — no fuzzy column matching, no heuristics, no auto-fix.
 * The parser's sole job is to read a .xlsx file into the Phase 2 `RawImport`
 * shape ({ name, days: [{ name, exercises: [{ name, sets, reps, weight, notes }] }] }).
 * Everything after that (normalize → validate → resolve → preview → save) is
 * the shared pipeline.
 *
 * Structural problems (unreadable file, wrong type, missing required columns,
 * no data rows) throw here so the import screen can show them BEFORE preview.
 * Row-level data problems (blank exercise name, non-numeric sets/reps) are left
 * intact and caught by the existing validation layer on the preview screen.
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

/**
 * Parse a user-selected .xlsx File into a RawImport.
 *
 * @param {File} file
 * @param {{ fallbackName?: string }} [options] fallbackName seeds the program
 *        name (typically derived from the filename) since spreadsheets carry no
 *        routine-name column.
 * @returns {Promise<import('./importTypes').RawImport>}
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

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: false,
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
  for (const row of rows.slice(headerRowIndex + 1)) {
    const day = String(cellAt(row, colIndex.Day)).trim()
    const exerciseName = String(cellAt(row, colIndex.Exercise)).trim()
    const sets = cellAt(row, colIndex.Sets)
    const reps = cellAt(row, colIndex.Reps)
    const weight = colIndex.Weight >= 0 ? cellAt(row, colIndex.Weight) : ''
    const notes =
      colIndex.Notes >= 0 ? String(cellAt(row, colIndex.Notes)).trim() : ''

    // Skip fully-empty rows; they are not an error.
    const isEmpty =
      !day &&
      !exerciseName &&
      String(sets).trim() === '' &&
      String(reps).trim() === '' &&
      String(weight).trim() === '' &&
      !notes
    if (isEmpty) continue

    parsedRows.push({ day, exerciseName, sets, reps, weight, notes })
  }

  if (parsedRows.length === 0) {
    throw new Error('No exercise rows found in the spreadsheet.')
  }

  return groupRowsToRawImport(parsedRows, fallbackName)
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
