import { describe, it, expect } from 'vitest'
import { resolveEditorRoutine } from './resolveEditorRoutine'

const loaded = { id: 'r1', name: 'Push', exercises: [] }

describe('resolveEditorRoutine', () => {
  it('uses the loaded routine when no workout has been started', () => {
    expect(resolveEditorRoutine(loaded, null)).toBe(loaded)
  })

  it('prefers the routine a workout was started from', () => {
    // What "Save & start" persisted: newer than the copy the page loaded.
    const startedFrom = { id: 'r1', name: 'Push', exercises: [{ exerciseId: 'e1' }] }
    expect(resolveEditorRoutine(loaded, startedFrom)).toBe(startedFrom)
  })

  it('ignores a remembered routine belonging to a different routine', () => {
    expect(resolveEditorRoutine(loaded, { id: 'r2', name: 'Pull' })).toBe(loaded)
  })

  it('ignores a remembered routine with no id', () => {
    expect(resolveEditorRoutine(loaded, { name: 'Push' })).toBe(loaded)
  })

  it('never invents a routine when nothing was loaded', () => {
    expect(resolveEditorRoutine(null, { id: 'r1' })).toBe(null)
  })
})
