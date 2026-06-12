import { newId } from '../../utils/id'

/**
 * Marker stored on every user-owned exercise so it can be distinguished from
 * the static built-in dataset (which has no `source` field). The resolver and
 * any future import flow rely on this constant rather than a raw string.
 */
export const CUSTOM_EXERCISE_SOURCE = 'custom'

/**
 * Build a custom exercise object that mirrors the built-in exercise shape as
 * closely as possible so it can be used interchangeably anywhere the app
 * expects an exercise (routine builder, workout session, history, search).
 *
 * Deviation from the phase brief's illustrative schema: `instructions` is an
 * array, not a string. Built-in exercises use a string[] and `ExerciseCard`
 * maps over it, so an array keeps custom exercises render-compatible and avoids
 * future migration work — which is the stated goal of mirroring the structure.
 *
 * Only `name` is required. All descriptive fields default to the same "empty"
 * values a built-in exercise could legitimately hold, so a future import can
 * create a usable exercise from a bare name and fill in details later.
 *
 * @param {object} input
 * @param {string} input.name           Display name (required, trimmed).
 * @param {string} [input.id]           Pre-assigned id; generated if omitted.
 * @param {string|null} [input.bodyPart]
 * @param {string[]} [input.targetMuscles]
 * @param {string[]} [input.secondaryMuscles]
 * @param {string|null} [input.equipment]
 * @param {string[]} [input.instructions]
 * @param {string|null} [input.difficulty]
 * @param {boolean} [input.isBodyweight]
 */
export function createCustomExercise(input = {}) {
  const now = Date.now()
  const name = typeof input.name === 'string' ? input.name.trim() : ''

  return {
    id: input.id || newId(),
    name,
    source: CUSTOM_EXERCISE_SOURCE,
    bodyPart: input.bodyPart ?? null,
    targetMuscles: Array.isArray(input.targetMuscles) ? input.targetMuscles : [],
    secondaryMuscles: Array.isArray(input.secondaryMuscles)
      ? input.secondaryMuscles
      : [],
    equipment: input.equipment ?? null,
    instructions: Array.isArray(input.instructions) ? input.instructions : [],
    difficulty: input.difficulty ?? null,
    isBodyweight:
      typeof input.isBodyweight === 'boolean' ? input.isBodyweight : false,
    createdAt: input.createdAt || now,
    updatedAt: now
  }
}
