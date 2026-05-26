import styles from './HistorySetRow.module.css'

function formatWeight(weight, unit) {
  if (weight === null || weight === undefined || weight === '') return '—'
  return `${weight} ${unit || 'lb'}`
}

export function HistorySetRow({ set, index }) {
  const rowClass = [styles.row, set.completed && styles.rowCompleted]
    .filter(Boolean)
    .join(' ')
  const cellClass = [styles.cell, set.completed && styles.cellCompleted]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowClass}>
      <span className={styles.index}>{index + 1}</span>
      <span className={cellClass}>{set.reps ?? 0}</span>
      <span className={cellClass}>{formatWeight(set.weight, set.unit)}</span>
      <span
        className={styles.status}
        aria-label={set.completed ? 'Completed' : 'Not completed'}
      >
        {set.completed ? '✓' : '–'}
      </span>
    </div>
  )
}

export function HistorySetRowHeader() {
  return (
    <div className={styles.header}>
      <span>#</span>
      <span>Reps</span>
      <span>Weight</span>
      <span>Done</span>
    </div>
  )
}
