import { memo } from 'react'
import { SetRow, SetRowHeader } from './SetRow'
import styles from './RoutineExerciseItem.module.css'

function RoutineExerciseItemImpl({
  exercise,
  index,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onUpdateNotes,
  onUpdateSupersetGroup,
  onUpdateAllUnits
}) {
  const allUnit = exercise.sets.every((s) => s.unit === exercise.sets[0]?.unit)
    ? exercise.sets[0]?.unit
    : null

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={styles.order}>{index + 1}.</span>
        <span className={styles.name}>{exercise.name}</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move exercise up"
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move exercise down"
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.danger}`}
          onClick={onRemove}
          aria-label="Remove exercise"
          title="Remove"
        >
          ×
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.unitRow}>
          <span className={styles.unitLabel}>Unit</span>
          <div
            className={styles.unitToggle}
            role="group"
            aria-label="Weight unit"
          >
            <button
              type="button"
              className={allUnit === 'lb' ? styles.active : ''}
              onClick={() => onUpdateAllUnits('lb')}
            >
              lb
            </button>
            <button
              type="button"
              className={allUnit === 'kg' ? styles.active : ''}
              onClick={() => onUpdateAllUnits('kg')}
            >
              kg
            </button>
          </div>
        </div>

        <SetRowHeader />
        <div className={styles.sets}>
          {exercise.sets.map((set, setIndex) => (
            <SetRow
              key={setIndex}
              set={set}
              index={setIndex}
              onUpdate={(patch) => onUpdateSet(setIndex, patch)}
              onRemove={() => onRemoveSet(setIndex)}
            />
          ))}
        </div>

        <button type="button" className={styles.addSet} onClick={onAddSet}>
          + Add set
        </button>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Notes</span>
          <textarea
            className={styles.notes}
            value={exercise.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Cues, tempo, alternates…"
            rows={2}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Superset group</span>
          <input
            type="text"
            className={styles.superset}
            value={exercise.supersetGroup ?? ''}
            onChange={(e) => onUpdateSupersetGroup(e.target.value)}
            placeholder="A, B, … (leave blank for none)"
            maxLength={16}
          />
        </label>
      </div>
    </div>
  )
}

export const RoutineExerciseItem = memo(RoutineExerciseItemImpl)
