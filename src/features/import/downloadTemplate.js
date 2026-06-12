import * as XLSX from 'xlsx'
import { REQUIRED_COLUMNS, OPTIONAL_COLUMNS } from './parseXlsx'

/**
 * Generate and download the XLSX import template.
 *
 * The header row is built from the SAME column constants the parser reads, so
 * the template and parser can never drift out of alignment. A few example rows
 * show the expected layout (one row per exercise, grouped by Day).
 */

const TEMPLATE_HEADERS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

const EXAMPLE_ROWS = [
  ['Push Day', 'Bench Press', 4, 8, 135, ''],
  ['Push Day', 'Incline Dumbbell Press', 3, 10, 50, ''],
  ['Push Day', 'Lateral Raise', 3, 12, '', 'Slow tempo'],
  ['Pull Day', 'Deadlift', 3, 5, 225, ''],
  ['Pull Day', 'Barbell Row', 4, 8, 95, '']
]

export function downloadTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...EXAMPLE_ROWS])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Routine')
  XLSX.writeFile(workbook, 'weighttrack-import-template.xlsx')
}
