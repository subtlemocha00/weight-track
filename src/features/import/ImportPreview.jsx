import { RESOLUTION } from './importTypes'
import styles from './ImportPreview.module.css'

/**
 * Reusable import preview.
 *
 * Presentational only — it renders a ResolvedImport plus its ValidationResult
 * and exposes Import / Cancel actions. Every future import method routes
 * through this same component before anything is saved.
 *
 * Props:
 * - resolved:   ResolvedImport ({ name, days, summary })
 * - validation: ValidationResult ({ valid, errors, warnings })
 * - saving:     boolean — disables Import while a save is in flight
 * - error:      optional save-error string
 * - onImport:   () => void
 * - onCancel:   () => void
 */
export function ImportPreview({
  resolved,
  validation,
  saving = false,
  error = '',
  onImport,
  onCancel
}) {
  const days = resolved?.days ?? []
  const summary = resolved?.summary ?? { builtin: 0, custom: 0, notFound: 0 }
  const canImport = validation?.valid && !saving

  return (
    <div className={styles.preview}>
      <div className={styles.head}>
        <span className={styles.headLabel}>Routine</span>
        <h2 className={styles.routineName}>{resolved?.name || 'Untitled import'}</h2>
        <div className={styles.summary}>
          <span className={styles.badgeBuiltin}>{summary.builtin} built-in</span>
          <span className={styles.badgeCustom}>{summary.custom} custom</span>
          <span className={styles.badgeMissing}>{summary.notFound} not found</span>
        </div>
      </div>

      {validation && !validation.valid && (
        <div className={styles.errors}>
          <span className={styles.errorsTitle}>
            Cannot import — fix these first:
          </span>
          <ul className={styles.errorList}>
            {validation.errors.map((issue, i) => (
              <li key={i}>
                <span className={styles.errorPath}>{issue.path}</span>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.days}>
        {days.map((day, dayIndex) => (
          <section key={dayIndex} className={styles.day}>
            <h3 className={styles.dayName}>{day.name || `Day ${dayIndex + 1}`}</h3>
            <ul className={styles.exerciseList}>
              {day.exercises.map((exercise, exIndex) => (
                <li key={exIndex} className={styles.exercise}>
                  <div className={styles.exerciseMain}>
                    <span className={styles.exerciseName}>{exercise.name}</span>
                    <ResolutionBadge resolution={exercise.resolution} />
                  </div>
                  <span className={styles.setsReps}>
                    {exercise.sets} × {exercise.reps}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {error && <div className={styles.saveError}>{error}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.import}
          onClick={onImport}
          disabled={!canImport}
          title={
            validation && !validation.valid
              ? 'Resolve the validation errors above first'
              : 'Save as a routine'
          }
        >
          {saving ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  )
}

function ResolutionBadge({ resolution }) {
  if (!resolution?.found) {
    return <span className={styles.tagMissing}>not found</span>
  }
  if (resolution.source === RESOLUTION.CUSTOM) {
    return <span className={styles.tagCustom}>custom</span>
  }
  return <span className={styles.tagBuiltin}>built-in</span>
}
