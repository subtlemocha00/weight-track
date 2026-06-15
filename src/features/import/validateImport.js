import { MIN_SETS, MAX_SETS, MIN_REPS, MAX_REPS } from './importTypes'

/**
 * Validate step of the import pipeline.
 *
 * Operates on a NormalizedImport. Reusable by any future parser: a parser
 * normalizes its output, then hands it here before the preview is shown. No
 * import may bypass validation.
 *
 * Checks (per the phase brief):
 *   - routine (program) name exists
 *   - at least one workout day exists, each with a name
 *   - each exercise exists and has a name
 *   - set count is a valid integer within bounds
 *   - rep count is a valid integer within bounds
 *
 * @param {{name: string, days: Array}} normalized
 * @returns {import('./importTypes').ValidationResult}
 */
export function validateImport(normalized) {
  const errors = []
  const warnings = []

  if (!normalized || typeof normalized !== 'object') {
    return {
      valid: false,
      errors: [{ path: 'Import', message: 'No import data was provided.' }],
      warnings
    }
  }

  if (!normalized.name) {
    errors.push({ path: 'Routine', message: 'Routine name is required.' })
  }

  const days = Array.isArray(normalized.days) ? normalized.days : []
  if (days.length === 0) {
    errors.push({
      path: 'Routine',
      message: 'At least one workout day is required.'
    })
  }

  days.forEach((day, dayIndex) => {
    const dayLabel = day?.name || `Day ${dayIndex + 1}`

    if (!day?.name) {
      errors.push({
        path: dayLabel,
        message: 'Workout day name is required.'
      })
    }

    const exercises = Array.isArray(day?.exercises) ? day.exercises : []
    if (exercises.length === 0) {
      errors.push({
        path: dayLabel,
        message: 'Each workout day must have at least one exercise.'
      })
    }

    exercises.forEach((exercise, exIndex) => {
      const exLabel = `${dayLabel} › ${exercise?.name || `Exercise ${exIndex + 1}`}`

      if (!exercise?.name) {
        errors.push({ path: exLabel, message: 'Exercise name is required.' })
      }

      if (!isValidCount(exercise?.sets, MIN_SETS, MAX_SETS)) {
        errors.push({
          path: exLabel,
          message: `Set count must be a whole number between ${MIN_SETS} and ${MAX_SETS}.`
        })
      }

      if (!isValidCount(exercise?.reps, MIN_REPS, MAX_REPS)) {
        errors.push({
          path: exLabel,
          message: `Rep count must be a whole number between ${MIN_REPS} and ${MAX_REPS}.`
        })
      }
    })
  })

  return { valid: errors.length === 0, errors, warnings }
}

function isValidCount(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}
