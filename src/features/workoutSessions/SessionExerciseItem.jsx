import { memo, useCallback, useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { SessionSetRow, SessionSetRowHeader } from './SessionSetRow'
import { RestTimer } from './RestTimer'
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
  const { settings } = useSettings()
  const timerEnabled = !readOnly && settings.restTimerEnabled
  const timerSeconds = settings.defaultRestSeconds

  // `restAfter.index` is the set index that just got completed and is currently
  // showing a countdown below it. `stamp` is bumped each time we (re)start so a
  // new instance of RestTimer mounts with a fresh countdown even if the same
  // set is re-completed.
  const [restAfter, setRestAfter] = useState(null)

  // If the user un-completes the set that owns the active timer (or the timer
  // was disabled mid-rest, or read-only kicked in), drop the timer.
  useEffect(() => {
    if (restAfter === null) return
    if (!timerEnabled) {
      setRestAfter(null)
      return
    }
    const owningSet = exercise.sets[restAfter.index]
    if (!owningSet || !owningSet.completed) {
      setRestAfter(null)
    }
  }, [restAfter, timerEnabled, exercise.sets])

  const handleToggleSetCompleted = useCallback(
    (setIndex) => {
      const wasCompleted = exercise.sets[setIndex]?.completed
      onToggleSetCompleted(setIndex)

      const willBeCompleted = !wasCompleted
      const hasNextSet = setIndex < exercise.sets.length - 1

      if (willBeCompleted && timerEnabled && hasNextSet) {
        setRestAfter({ index: setIndex, stamp: Date.now() })
      } else if (!willBeCompleted && restAfter?.index === setIndex) {
        setRestAfter(null)
      }
    },
    [exercise.sets, onToggleSetCompleted, timerEnabled, restAfter]
  )

  const handleRestDone = useCallback(() => setRestAfter(null), [])

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
            <div key={setIndex} className={styles.setBlock}>
              <SessionSetRow
                set={set}
                index={setIndex}
                disabled={readOnly}
                onUpdate={(patch) => onUpdateSet(setIndex, patch)}
                onToggleCompleted={() => handleToggleSetCompleted(setIndex)}
              />
              {restAfter?.index === setIndex && (
                <RestTimer
                  key={restAfter.stamp}
                  seconds={timerSeconds}
                  onDone={handleRestDone}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const SessionExerciseItem = memo(SessionExerciseItemImpl)
