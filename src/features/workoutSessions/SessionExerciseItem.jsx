import { memo, useCallback, useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { SessionSetRow, SessionSetRowHeader } from './SessionSetRow'
import { RestTimer } from './RestTimer'
import { findRestTimerOwner } from './restTimerOwner'
import { SupersetControl } from '../../components/SupersetControl'
import { WatchVideoButton } from '../exercises/WatchVideoButton'
import { isSafeVideoUrl } from '../../services/exercises'
import { supersetColor } from '../../utils/supersets'
import styles from './SessionExerciseItem.module.css'

function SessionExerciseItemImpl({
  exercise,
  index,
  isFirst,
  isLast,
  readOnly,
  instructions = [],
  videoUrl = null,
  supersetCount,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSwap,
  onAssignSuperset,
  onUpdateSet,
  onToggleSetCompleted,
  onSetUnit,
  onAddSet,
  onRemoveSet
}) {
  const { settings } = useSettings()
  const timerEnabled = !readOnly && settings.restTimerEnabled
  const timerSeconds = settings.defaultRestSeconds

  // Identified by the completion time of the set that started it, not by that
  // set's position: sets can be removed mid-workout, and removing an earlier one
  // shifts the rest down an index.
  const [restAfter, setRestAfter] = useState(null)
  const restIndex = findRestTimerOwner(exercise.sets, restAfter?.timestamp ?? null)

  useEffect(() => {
    if (restAfter === null) return
    // The set that was resting is gone — removed, or marked not-done again — or
    // the timer has been switched off in settings.
    if (!timerEnabled || restIndex === -1) {
      setRestAfter(null)
    }
  }, [restAfter, timerEnabled, restIndex])

  const handleToggleSetCompleted = useCallback(
    (setIndex) => {
      const willBeCompleted = !exercise.sets[setIndex]?.completed
      // One clock reading, used twice: it stamps the set as completed and is how
      // the timer keeps hold of that set afterwards.
      const timestamp = willBeCompleted ? Date.now() : null
      onToggleSetCompleted(setIndex, timestamp)

      const hasNextSet = setIndex < exercise.sets.length - 1
      if (willBeCompleted && timerEnabled && hasNextSet) {
        setRestAfter({ timestamp })
      }
      // Marking a set not-done needs no branch here: its timestamp is cleared,
      // so the effect above stops finding it and ends the rest.
    },
    [exercise.sets, onToggleSetCompleted, timerEnabled]
  )

  const handleRestDone = useCallback(() => setRestAfter(null), [])

  const allUnit = exercise.sets.every((s) => s.unit === exercise.sets[0]?.unit)
    ? exercise.sets[0]?.unit
    : null

  const doneSets = exercise.sets.filter((s) => s.completed).length
  const totalSets = exercise.sets.length
  const allDone = doneSets === totalSets && totalSets > 0

  const ssColor = supersetColor(exercise.supersetId)

  const itemClass = [styles.item, allDone && styles.allDone, ssColor && styles.assigned].filter(Boolean).join(' ')
  const orderClass = [styles.order, allDone && styles.orderDone].filter(Boolean).join(' ')
  const headerClass = [styles.header, allDone && styles.headerDone].filter(Boolean).join(' ')

  return (
    <div className={itemClass} style={ssColor ? { '--ss-color': ssColor } : undefined}>
      <div className={headerClass}>
        <span className={orderClass}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.name}>{exercise.name}</span>
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
        <button
          type="button"
          className={`${styles.iconButton} ${styles.remove}`}
          onClick={onRemove}
          disabled={readOnly}
          aria-label="Remove exercise from workout"
          title="Remove"
        >
          ✕
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

        {!readOnly && (
          <SupersetControl
            supersetId={exercise.supersetId ?? null}
            supersetCount={supersetCount}
            onAssign={onAssignSuperset}
          />
        )}

        {/* Swap sends the user to the Exercise Library to pick a replacement;
            all logged sets/reps/weights/notes/superset are kept on return. */}
        {!readOnly && typeof onSwap === 'function' && (
          <button type="button" className={styles.swap} onClick={onSwap}>
            Swap Exercise
          </button>
        )}

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
            <div key={setIndex} className={styles.setBlock}>
              <SessionSetRow
                set={set}
                index={setIndex}
                disabled={readOnly}
                onUpdate={(patch) => onUpdateSet(setIndex, patch)}
                onToggleCompleted={() => handleToggleSetCompleted(setIndex)}
                onRemove={() => onRemoveSet(setIndex)}
              />
              {restIndex === setIndex && (
                <RestTimer
                  key={restAfter.timestamp}
                  seconds={timerSeconds}
                  onDone={handleRestDone}
                />
              )}
            </div>
          ))}
        </div>

        {/* An extra set worked today. Session-only, like every other edit on
            this card — the routine changes only via Finish → Update routine. */}
        {!readOnly && (
          <button type="button" className={styles.addSet} onClick={onAddSet}>
            + Add set
          </button>
        )}

        {/* Notes are the final block on every exercise card. Read-only here:
            they are routine guidance carried into the workout, not a log. */}
        <details className={styles.notesPanel}>
          <summary
            className={`${styles.notesToggle} ${exercise.notes ? styles.hasNotes : ''}`}
          >
            Notes
          </summary>
          <div className={styles.notesBody}>
            {exercise.notes ? (
              <p className={styles.notes}>{exercise.notes}</p>
            ) : (
              <p className={styles.notesEmpty}>No notes</p>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

export const SessionExerciseItem = memo(SessionExerciseItemImpl)
