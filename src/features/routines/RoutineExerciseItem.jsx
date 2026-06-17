import { memo } from 'react'
import { SetRow, SetRowHeader } from './SetRow'
import { SupersetControl } from '../../components/SupersetControl'
import { WatchVideoButton } from '../exercises/WatchVideoButton'
import { isSafeVideoUrl } from '../../services/exercises'
import { supersetColor } from '../../utils/supersets'
import styles from './RoutineExerciseItem.module.css'

function RoutineExerciseItemImpl({
  exercise,
  index,
  isFirst,
  isLast,
  instructions = [],
  videoUrl = null,
  supersetCount,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onUpdateNotes,
  onAssignSuperset,
  onUpdateAllUnits
}) {
  const allUnit = exercise.sets.every((s) => s.unit === exercise.sets[0]?.unit)
    ? exercise.sets[0]?.unit
    : null

  const ssColor = supersetColor(exercise.supersetId)
  const itemClass = `${styles.item} ${ssColor ? styles.assigned : ''}`

  return (
    <div className={itemClass} style={ssColor ? { '--ss-color': ssColor } : undefined}>
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
        {(instructions.length > 0 || isSafeVideoUrl(videoUrl)) && (
          <details className={styles.instructionsPanel}>
            <summary className={styles.instructionsToggle}>Instructions</summary>
            {instructions.length > 0 && (
              <ol className={styles.instructions}>
                {instructions.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ol>
            )}
            <div className={styles.instructionsVideo}>
              <WatchVideoButton videoUrl={videoUrl} />
            </div>
          </details>
        )}

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

        <details className={styles.notesPanel}>
          <summary
            className={`${styles.notesToggle} ${exercise.notes ? styles.hasNotes : ''}`}
          >
            Notes
          </summary>
          <div className={styles.notesBody}>
            <textarea
              className={styles.notes}
              value={exercise.notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Cues, tempo, alternates…"
              rows={2}
              aria-label="Exercise notes"
            />
          </div>
        </details>

        <SupersetControl
          supersetId={exercise.supersetId ?? null}
          supersetCount={supersetCount}
          onAssign={onAssignSuperset}
        />
      </div>
    </div>
  )
}

export const RoutineExerciseItem = memo(RoutineExerciseItemImpl)
