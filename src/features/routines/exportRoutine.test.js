import { describe, it, expect } from 'vitest'
import {
  serializeRoutineExport,
  buildExportFilename,
  EXPORT_FORMAT,
  EXPORT_VERSION
} from './exportRoutine'

const routine = {
  id: 'routine-1',
  name: 'Push Day',
  createdAt: 1000,
  updatedAt: 2000,
  exercises: [
    {
      exerciseId: 'ex-bench',
      name: 'Bench Press',
      order: 0,
      notes: 'warm up first',
      supersetGroup: null,
      sets: [
        { reps: 8, targetWeight: 135, unit: 'lb', restSeconds: 90 },
        { reps: 8, targetWeight: 135, unit: 'lb', restSeconds: 90 }
      ]
    },
    {
      exerciseId: null,
      name: 'Lateral Raise',
      order: 1,
      notes: '',
      supersetGroup: null,
      sets: [{ reps: 12, targetWeight: null, unit: 'lb', restSeconds: null }]
    }
  ]
}

describe('serializeRoutineExport', () => {
  it('wraps the routine in the versioned envelope', () => {
    const out = serializeRoutineExport(routine)
    expect(out.format).toBe(EXPORT_FORMAT)
    expect(out.version).toBe(EXPORT_VERSION)
    expect(out.routine.name).toBe('Push Day')
  })

  it('maps a single routine to one day named after the routine', () => {
    const out = serializeRoutineExport(routine)
    expect(out.routine.days).toHaveLength(1)
    expect(out.routine.days[0].name).toBe('Push Day')
    expect(out.routine.days[0].exercises).toHaveLength(2)
  })

  it('collapses each exercise to flat sets/reps/weight/rest', () => {
    const [bench, raise] = serializeRoutineExport(routine).routine.days[0].exercises
    expect(bench).toEqual({
      exerciseId: 'ex-bench',
      exerciseName: 'Bench Press',
      sets: 2,
      reps: 8,
      weight: 135,
      notes: 'warm up first',
      rest: 90
    })
    // Missing optional fields become null, not 0.
    expect(raise).toEqual({
      exerciseId: null,
      exerciseName: 'Lateral Raise',
      sets: 1,
      reps: 12,
      weight: null,
      notes: '',
      rest: null
    })
  })

  it('carries routine timestamps but never the Firestore doc id', () => {
    const out = serializeRoutineExport(routine)
    expect(out.routine.createdAt).toBe(1000)
    expect(out.routine.updatedAt).toBe(2000)
    expect(JSON.stringify(out)).not.toContain('routine-1')
  })

  it('is deterministic — identical state yields byte-identical JSON', () => {
    const a = JSON.stringify(serializeRoutineExport(routine))
    const b = JSON.stringify(serializeRoutineExport(routine))
    expect(a).toBe(b)
  })

  it('tolerates malformed input', () => {
    const out = serializeRoutineExport({ name: 'Bare' })
    expect(out.routine.days[0].exercises).toEqual([])
    expect(out.routine.createdAt).toBeNull()

    const empty = serializeRoutineExport(null)
    expect(empty.routine.name).toBe('')
    expect(empty.routine.days[0].exercises).toEqual([])
  })
})

describe('buildExportFilename', () => {
  it('slugifies the routine name', () => {
    expect(buildExportFilename('Push Day')).toBe('weighttrack_push_day_export.json')
  })

  it('strips special characters and collapses spaces', () => {
    expect(buildExportFilename('Leg / Glute  Day!')).toBe(
      'weighttrack_leg_glute_day_export.json'
    )
  })

  it('falls back to "routine" for an empty/blank name', () => {
    expect(buildExportFilename('')).toBe('weighttrack_routine_export.json')
    expect(buildExportFilename('   ')).toBe('weighttrack_routine_export.json')
    expect(buildExportFilename(undefined)).toBe('weighttrack_routine_export.json')
  })
})
