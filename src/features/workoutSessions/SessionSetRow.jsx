import styles from './SessionSetRow.module.css'

function parseInt10(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

function parseFloatNum(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

export function SessionSetRow({
  set,
  index,
  disabled,
  onUpdate,
  onToggleCompleted
}) {
  const rowClass = [styles.row, set.completed && styles.rowCompleted]
    .filter(Boolean)
    .join(' ')
  const indexClass = [styles.index, set.completed && styles.indexCompleted]
    .filter(Boolean)
    .join(' ')
  const inputClass = [styles.input, set.completed && styles.inputCompleted]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowClass}>
      <span className={indexClass}>{index + 1}</span>

      <input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        className={inputClass}
        value={set.reps ?? ''}
        aria-label={`Set ${index + 1} reps`}
        disabled={disabled}
        onChange={(e) => onUpdate({ reps: parseInt10(e.target.value) ?? 0 })}
      />

      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        className={inputClass}
        value={set.weight ?? ''}
        placeholder="—"
        aria-label={`Set ${index + 1} weight`}
        disabled={disabled}
        onChange={(e) =>
          onUpdate({ weight: parseFloatNum(e.target.value) })
        }
      />

      <button
        type="button"
        className={`${styles.completed} ${set.completed ? styles.completedOn : ''}`}
        onClick={onToggleCompleted}
        disabled={disabled}
        aria-pressed={set.completed}
        aria-label={
          set.completed
            ? `Mark set ${index + 1} as not done`
            : `Mark set ${index + 1} complete`
        }
      >
        {set.completed ? '✓' : ''}
      </button>
    </div>
  )
}

export function SessionSetRowHeader() {
  return (
    <div className={styles.header}>
      <span>#</span>
      <span>Reps</span>
      <span>Weight</span>
      <span>Done</span>
    </div>
  )
}
