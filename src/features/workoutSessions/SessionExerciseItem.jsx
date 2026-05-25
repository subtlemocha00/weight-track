import { memo } from 'react'
import { SessionSetRow, SessionSetRowHeader } from './SessionSetRow'
import styles from './SessionExerciseItem.module.css'

function SessionExerciseItemImpl({
  exercise,
  index,
  isFirst,
  isLast,
  readOnly,
  onMoveUp,
  onMoveDown,
  onUpdateSet,
  onToggleSetCompleted,
  onSetUnit
}) {
  const allUnit = exercise.sets.every((s) => s.unit === exercise.sets[0]?.unit)
    ? exercise.sets[0]?.unit
    : null

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={styles.order}>{index + 1}.</span>
        <span className={styles.name}>{exercise.name}</span>
        {exercise.supersetGroup && (
          <span className={styles.superset}>SS {exercise.supersetGroup}</span>
        )}
        <button
          type="button"
          className={styles.iconButton}
          onClick={onMoveUp}
          disabled={isFirst || readOnly}
          aria-label="Move exercise up"
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onMoveDown}
          disabled={isLast || readOnly}
          aria-label="Move exercise down"
          title="Move down"
        >
          ↓
        </button>
      </div>

      <div className={styles.body}>
        {exercise.notes && <p className={styles.notes}>{exercise.notes}</p>}

        <div className={styles.unitRow}>
          <span className={styles.unitLabel}>Unit</span>
          <div className={styles.unitToggle} role="group" aria-label="Weight unit">
            <button
              type="button"
              className={allUnit === 'lb' ? styles.active : ''}
              onClick={() => onSetUnit('lb')}
              disabled={readOnly}
            >
              lb
            </button>
            <button
              type="button"
              className={allUnit === 'kg' ? styles.active : ''}
              onClick={() => onSetUnit('kg')}
              disabled={readOnly}
            >
              kg
            </button>
          </div>
        </div>

        <SessionSetRowHeader />
        <div className={styles.sets}>
          {exercise.sets.map((set, setIndex) => (
            <SessionSetRow
              key={setIndex}
              set={set}
              index={setIndex}
              disabled={readOnly}
              onUpdate={(patch) => onUpdateSet(setIndex, patch)}
              onToggleCompleted={() => onToggleSetCompleted(setIndex)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const SessionExerciseItem = memo(SessionExerciseItemImpl)
