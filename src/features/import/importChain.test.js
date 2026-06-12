import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxFile } from './parseXlsx'
import { normalizeImport } from './normalizeImport'
import { validateImport } from './validateImport'
import { resolveImport } from './resolveImport'

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

describe('XLSX → pipeline chain', () => {
  it('produces a valid, resolved model from a well-formed sheet', async () => {
    const file = makeXlsxFile([
      HEADERS,
      // built-in exact match
      ['Push Day', 'Incline Dumbbell Press', 3, 10, 50, ''],
      // not found → would become custom on save
      ['Push Day', 'Bench Press', 4, 8, 135, '']
    ])

    const raw = await parseXlsxFile(file, { fallbackName: 'program' })
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

  it('flags row-level problems via the existing validator (not the parser)', async () => {
    const file = makeXlsxFile([
      HEADERS,
      ['', 'Squat', 0, 8, '', ''] // blank day, zero sets
    ])

    const raw = await parseXlsxFile(file)
    const validation = validateImport(normalizeImport(raw))

    expect(validation.valid).toBe(false)
    const messages = validation.errors.map((e) => e.message).join(' ')
    expect(messages).toMatch(/workout day name is required/i)
    expect(messages).toMatch(/set count/i)
  })
})
