/**
 * Mock raw import payload — the ONLY data source in this phase.
 *
 * It stands in for whatever a future parser will emit, deliberately "messy"
 * (untrimmed name, string-typed sets/reps) so the normalize step has something
 * real to do. The exercise names exercise all resolver branches against the
 * built-in dataset:
 *   - "Incline Dumbbell Press" → built-in exact match
 *   - "Bench Press" / "Lateral Raise" → not found (would become custom later)
 *
 * @type {import('./importTypes').RawImport}
 */
export const MOCK_IMPORT = {
  name: '  Imported Push Program ',
  days: [
    {
      name: 'Push Day',
      exercises: [
        { name: 'Bench Press', sets: '4', reps: '8' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
        { name: 'Lateral Raise', sets: '3', reps: '12' }
      ]
    }
  ]
}
