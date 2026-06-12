import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxFile } from './parseXlsx'

/** Build an in-memory .xlsx File from an array-of-arrays. */
function makeXlsxFile(aoa, filename = 'routine.xlsx') {
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([bytes], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

const HEADERS = ['Day', 'Exercise', 'Sets', 'Reps', 'Weight', 'Notes']

describe('parseXlsxFile', () => {
  it('parses rows and groups them by day in first-seen order', async () => {
    const file = makeXlsxFile(
      [
        HEADERS,
        ['Push Day', 'Bench Press', 4, 8, 135, ''],
        ['Push Day', 'Incline Dumbbell Press', 3, 10, '', 'slow'],
        ['Pull Day', 'Deadlift', 3, 5, 225, '']
      ],
      'My_Program.xlsx'
    )

    const { raw, skipped } = await parseXlsxFile(file, {
      fallbackName: 'My Program'
    })

    expect(skipped).toEqual([])
    expect(raw.name).toBe('My Program')
    expect(raw.days).toHaveLength(2)
    expect(raw.days[0].name).toBe('Push Day')
    expect(raw.days[0].exercises).toHaveLength(2)
    expect(raw.days[0].exercises[0]).toMatchObject({
      name: 'Bench Press',
      sets: 4,
      reps: 8,
      weight: 135,
      notes: ''
    })
    expect(raw.days[0].exercises[1].notes).toBe('slow')
    expect(raw.days[1].name).toBe('Pull Day')
  })

  it('matches headers case-insensitively and ignores "(optional)" suffixes', async () => {
    const file = makeXlsxFile([
      ['day', 'EXERCISE', 'Sets', 'reps', 'Weight (optional)', 'Notes (optional)'],
      ['Legs', 'Squat', 5, 5, 185, '']
    ])
    const { raw } = await parseXlsxFile(file)
    expect(raw.days[0].exercises[0]).toMatchObject({ name: 'Squat', sets: 5, reps: 5 })
  })

  it('skips fully-empty rows', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push', 'Bench Press', 3, 8, '', ''],
      ['', '', '', '', '', ''],
      ['Push', 'Dips', 3, 12, '', '']
    ])
    const { raw, skipped } = await parseXlsxFile(file)
    expect(raw.days[0].exercises).toHaveLength(2)
    expect(skipped).toEqual([])
  })

  it('rejects non-.xlsx files', async () => {
    const file = new File(['hello'], 'routine.csv', { type: 'text/csv' })
    await expect(parseXlsxFile(file)).rejects.toThrow(/Unsupported file type/i)
  })

  it('rejects spreadsheets missing required columns', async () => {
    const file = makeXlsxFile([
      ['Day', 'Exercise'],
      ['Push', 'Bench Press']
    ])
    await expect(parseXlsxFile(file)).rejects.toThrow(/Missing required column/i)
  })

  it('rejects spreadsheets with no exercise rows', async () => {
    const file = makeXlsxFile([HEADERS])
    await expect(parseXlsxFile(file)).rejects.toThrow(/No valid exercise rows/i)
  })

  it('skips malformed rows (non-blocking) and reports them with row numbers', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push', 'Bench Press', 4, 8, '', ''], // row 2 — valid
      ['Push', '', 3, 8, '', ''], // row 3 — missing exercise name
      ['Push', 'Curl', 'abc', 10, '', ''], // row 4 — non-numeric sets
      ['', 'Squat', 5, 5, '', ''] // row 5 — missing day
    ])
    const { raw, skipped } = await parseXlsxFile(file)

    // Only the one valid row survives.
    expect(raw.days[0].exercises).toHaveLength(1)
    expect(raw.days[0].exercises[0].name).toBe('Bench Press')

    // Each bad row is reported with its real spreadsheet row number + reason.
    expect(skipped).toHaveLength(3)
    expect(skipped[0]).toMatchObject({ row: 3, reason: 'Missing Exercise name' })
    expect(skipped[1]).toMatchObject({ row: 4 })
    expect(skipped[1].reason).toMatch(/Sets must be a whole number/i)
    expect(skipped[2]).toMatchObject({ row: 5, reason: 'Missing Day' })
  })

  it('throws (blocking) when every data row is malformed, noting the skip count', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push', '', 0, 8, '', ''],
      ['', 'Squat', 5, 5, '', '']
    ])
    await expect(parseXlsxFile(file)).rejects.toThrow(
      /No valid exercise rows.*2 row\(s\) had problems/is
    )
  })
})
