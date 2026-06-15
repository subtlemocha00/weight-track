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
  onRemove,
  onUpdateSet,
  onToggleSetCompleted,
  onSetUnit
}) {
  const { settings } = useSettings()
  const timerEnabled = !readOnly && settings.restTimerEnabled
  const timerSeconds = settings.defaultRestSeconds

  const [restAfter, setRestAfter] = useState(null)

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

  const doneSets = exercise.sets.filter((s) => s.completed).length
  const totalSets = exercise.sets.length
  const allDone = doneSets === totalSets && totalSets > 0

  const itemClass = [styles.item, allDone && styles.allDone].filter(Boolean).join(' ')
  const orderClass = [styles.order, allDone && styles.orderDone].filter(Boolean).join(' ')
  const setCountClass = [styles.setCount, allDone && styles.setCountDone].filter(Boolean).join(' ')
  const headerClass = [styles.header, allDone && styles.headerDone].filter(Boolean).join(' ')

  return (
    <div className={itemClass}>
      <div className={headerClass}>
        <span className={orderClass}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.name}>{exercise.name}</span>
        {exercise.supersetGroup && (
          <span className={styles.superset}>SS {exercise.supersetGroup}</span>
        )}
        <span className={setCountClass}>{doneSets}/{totalSets}</span>
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
