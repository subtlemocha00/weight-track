import styles from './SetRow.module.css'

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

export function SetRow({ set, index, onUpdate, onRemove }) {
  return (
    <div className={styles.row}>
      <span className={styles.index}>{index + 1}</span>

      <div className={styles.field}>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          className={styles.input}
          value={set.reps ?? ''}
          placeholder="—"
          aria-label={`Set ${index + 1} reps`}
          onChange={(e) => onUpdate({ reps: parseInt10(e.target.value) })}
        />
      </div>

      <div className={styles.field}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          className={styles.input}
          value={set.targetWeight ?? ''}
          placeholder="—"
          aria-label={`Set ${index + 1} target weight`}
          onChange={(e) =>
            onUpdate({ targetWeight: parseFloatNum(e.target.value) })
          }
        />
      </div>

      <div className={styles.field}>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="5"
          className={styles.input}
          value={set.restSeconds ?? ''}
          placeholder="—"
          aria-label={`Set ${index + 1} rest seconds`}
          onChange={(e) =>
            onUpdate({ restSeconds: parseInt10(e.target.value) })
          }
        />
      </div>

      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={`Remove set ${index + 1}`}
      >
        ×
      </button>
    </div>
  )
}

export function SetRowHeader() {
  return (
    <div className={styles.header}>
      <span>#</span>
      <span>Reps</span>
      <span>Weight</span>
      <span>Rest (s)</span>
      <span />
    </div>
  )
}
