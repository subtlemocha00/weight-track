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

    const raw = await parseXlsxFile(file, { fallbackName: 'My Program' })

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
    const raw = await parseXlsxFile(file)
    expect(raw.days[0].exercises[0]).toMatchObject({ name: 'Squat', sets: 5, reps: 5 })
  })

  it('skips fully-empty rows', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push', 'Bench Press', 3, 8, '', ''],
      ['', '', '', '', '', ''],
      ['Push', 'Dips', 3, 12, '', '']
    ])
    const raw = await parseXlsxFile(file)
    expect(raw.days[0].exercises).toHaveLength(2)
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
    await expect(parseXlsxFile(file)).rejects.toThrow(/No exercise rows/i)
  })

  it('passes blank exercise names / non-numeric counts through for the validator', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push', '', 'abc', 8, '', '']
    ])
    const raw = await parseXlsxFile(file)
    // Parser keeps the raw values; normalize+validate handle them downstream.
    expect(raw.days[0].exercises[0].name).toBe('')
    expect(raw.days[0].exercises[0].sets).toBe('abc')
  })
})
