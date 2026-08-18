import { describe, it, expect } from 'vitest'
import { resolveEditorRoutine } from './resolveEditorRoutine'

const loaded = { id: 'r1', name: 'Push', exercises: [] }

describe('resolveEditorRoutine', () => {
  it('uses the loaded routine when the editor has not saved', () => {
    expect(resolveEditorRoutine(loaded, null)).toBe(loaded)
  })

  it('prefers the newest saved routine', () => {
    // What Save (or "Save & start") persisted: newer than the copy the page
    // loaded, and the version the editor must come back to.
    const saved = { id: 'r1', name: 'Push', exercises: [{ exerciseId: 'e1' }] }
    expect(resolveEditorRoutine(loaded, saved)).toBe(saved)
  })

  it('ignores a saved routine belonging to a different routine', () => {
    expect(resolveEditorRoutine(loaded, { id: 'r2', name: 'Pull' })).toBe(loaded)
  })

  it('ignores a saved routine with no id', () => {
    expect(resolveEditorRoutine(loaded, { name: 'Push' })).toBe(loaded)
  })

  it('never invents a routine when nothing was loaded', () => {
    expect(resolveEditorRoutine(null, { id: 'r1' })).toBe(null)
  })
})
