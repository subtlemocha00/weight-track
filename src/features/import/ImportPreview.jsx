import { useMemo, useState } from 'react'
import { ConfirmModal } from '../../components/ConfirmModal'
import { RESOLUTION } from './importTypes'
import styles from './ImportPreview.module.css'

/**
 * Reusable import preview.
 *
 * Presentational only — it renders a ResolvedImport plus its ValidationResult,
 * any rows the parser skipped, and exposes Import / Cancel actions. Every import
 * method routes through this same component before anything is saved.
 *
 * The Import button does NOT save directly: it opens a confirmation step that
 * summarizes exactly what will be created (one routine per workout day, with
 * exercise and total-set counts) so an import can never happen by accident.
 *
 * Props:
 * - resolved:   ResolvedImport ({ name, days, summary })
 * - validation: ValidationResult ({ valid, errors, warnings })
 * - skipped:    Array<{ row, exercise, reason }> rows dropped during parsing
 * - saving:     boolean — disables actions while a save is in flight
 * - error:      optional save-error string
 * - onImport:   () => void   (called only after the user confirms)
 * - onCancel:   () => void
 */
export function ImportPreview({
  resolved,
  validation,
  skipped = [],
  saving = false,
  error = '',
  onImport,
  onCancel
}) {
  const days = useMemo(() => resolved?.days ?? [], [resolved])
  const summary = resolved?.summary ?? { builtin: 0, custom: 0, notFound: 0 }
  const canImport = validation?.valid && !saving
  const [confirming, setConfirming] = useState(false)

  // Per-day routine breakdown (exercise count + total sets) for both the
  // confirmation summary and to guarantee preview == what gets saved.
  const routineSummaries = useMemo(
    () =>
      days.map((day, i) => ({
        name: day.name || `Day ${i + 1}`,
        exercises: day.exercises.length,
        sets: day.exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0), 0)
      })),
    [days]
  )

  const confirmMessage = useMemo(() => {
    if (routineSummaries.length === 0) return ''
    const parts = routineSummaries.map(
      (r) => `${r.name} — ${r.exercises} exercise(s), ${r.sets} set(s)`
    )
    const lead =
      routineSummaries.length === 1
        ? 'This creates 1 routine:'
        : `This creates ${routineSummaries.length} routines:`
    return `${lead} ${parts.join('; ')}.`
  }, [routineSummaries])

  const handleConfirm = () => {
    setConfirming(false)
    onImport()
  }

  return (
    <div className={styles.preview}>
      <div className={styles.head}>
        <span className={styles.headLabel}>Routine</span>
        <h2 className={styles.routineName}>{resolved?.name || 'Untitled import'}</h2>
        <div className={styles.summary}>
          <span className={styles.badgeBuiltin}>{summary.builtin} built-in</span>
          <span className={styles.badgeCustom}>{summary.custom} custom</span>
          <span className={styles.badgeMissing}>{summary.notFound} to create</span>
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

      {skipped.length > 0 && (
        <div className={styles.skipped}>
          <span className={styles.skippedTitle}>
            {skipped.length} row(s) skipped — not imported:
          </span>
          <ul className={styles.skippedList}>
            {skipped.map((s, i) => (
              <li key={i}>
                <span className={styles.skippedRow}>Row {s.row}</span>
                {s.exercise ? `${s.exercise} — ` : ''}
                {s.reason}
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
          onClick={() => setConfirming(true)}
          disabled={!canImport}
          title={
            validation && !validation.valid
              ? 'Resolve the validation errors above first'
              : 'Review and confirm the import'
          }
        >
          {saving ? 'Importing…' : 'Import'}
        </button>
      </div>

      <ConfirmModal
        open={confirming && !saving}
        title="Import this routine?"
        message={confirmMessage}
        confirmLabel="Confirm Import"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

function ResolutionBadge({ resolution }) {
  // A not-found exercise is created as a custom exercise on save, so the preview
  // says "will create" rather than "not found" — it reflects the save outcome.
  if (!resolution?.found) {
    return <span className={styles.tagMissing}>will create</span>
  }
  if (resolution.source === RESOLUTION.CUSTOM) {
    return <span className={styles.tagCustom}>custom</span>
  }
  return <span className={styles.tagBuiltin}>built-in</span>
}
