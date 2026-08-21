import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxFile } from './parseXlsx'
import { normalizeImport } from './normalizeImport'
import { validateImport } from './validateImport'
import { resolveImport } from './resolveImport'
import { getAllExercises, resolveExercise } from '../../services/exercises'

/**
 * Read-only pipeline integration: parse → normalize → validate → resolve.
 * (The save step writes to Firestore and is exercised manually.)
 */

function makeXlsxFile(aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new File([bytes], 'program.xlsx')
}

const HEADERS = ['Day', 'Exercise', 'Sets', 'Reps', 'Weight', 'Notes']

// Taken from the library rather than typed in. Resolution is an exact
// case-insensitive match, so a hardcoded name only holds while the dataset
// happens to spell it that way — an earlier literal here ("Incline Dumbbell
// Press") was dropped by a dataset update and left this pipeline test red for
// a reason that had nothing to do with the pipeline.
const BUILTIN_NAME = getAllExercises()[0].name
// Not in any library: the row that resolves to nothing and would become a
// custom exercise on save.
const UNKNOWN_NAME = 'Zzz Not A Real Exercise'

describe('XLSX → pipeline chain', () => {
  it('uses fixture names the resolver really agrees with', () => {
    expect(resolveExercise(BUILTIN_NAME).source).toBe('builtin')
    expect(resolveExercise(UNKNOWN_NAME).found).toBe(false)
  })

  it('produces a valid, resolved model from a well-formed sheet', async () => {
    const file = makeXlsxFile([
      HEADERS,
      // built-in exact match
      ['Push Day', BUILTIN_NAME, 3, 10, 50, ''],
      // not found → would become custom on save
      ['Push Day', UNKNOWN_NAME, 4, 8, 135, '']
    ])

    const { raw } = await parseXlsxFile(file, { fallbackName: 'program' })
    const normalized = normalizeImport(raw)
    const validation = validateImport(normalized)
    const resolved = resolveImport(normalized, [])

    expect(validation.valid).toBe(true)
    expect(resolved.summary).toEqual({ builtin: 1, custom: 0, notFound: 1 })
    expect(resolved.days[0].exercises[0].resolution.source).toBe('builtin')
    expect(resolved.days[0].exercises[1].resolution.found).toBe(false)
    // optional Weight column threads through normalization
    expect(normalized.days[0].exercises[0].weight).toBe(50)
  })

  it('skips malformed rows at parse time so the validated model stays valid', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['Push Day', BUILTIN_NAME, 3, 10, 50, ''], // valid
      ['', 'Squat', 0, 8, '', ''] // blank day + zero sets → skipped
    ])

    const { raw, skipped } = await parseXlsxFile(file, { fallbackName: 'program' })
    const validation = validateImport(normalizeImport(raw))

    // The bad row never reaches the validator; the surviving model is valid.
    expect(validation.valid).toBe(true)
    expect(raw.days).toHaveLength(1)
    expect(raw.days[0].exercises).toHaveLength(1)
    // The drop is surfaced (non-blocking) with a reason for the preview.
    expect(skipped).toHaveLength(1)
    expect(skipped[0].row).toBe(3)
  })
})
