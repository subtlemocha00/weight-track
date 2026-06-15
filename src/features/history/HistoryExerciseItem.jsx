import { memo } from 'react'
import { HistorySetRow, HistorySetRowHeader } from './HistorySetRow'
import { countCompletedSets } from './formatSession'
import { supersetColor, supersetLabel } from '../../utils/supersets'
import styles from './HistoryExerciseItem.module.css'

function HistoryExerciseItemImpl({ exercise, index }) {
  const totalSets = exercise.sets?.length ?? 0
  const doneSets = countCompletedSets(exercise)

  // New sessions store a numeric supersetId; legacy completed sessions may carry
  // the old freeform supersetGroup string — show whichever exists (read-only).
  const ssColor = supersetColor(exercise.supersetId)
  const ssText = ssColor
    ? supersetLabel(exercise.supersetId)
    : exercise.supersetGroup
      ? `SS ${exercise.supersetGroup}`
      : null

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={styles.order}>{index + 1}.</span>
        <span className={styles.name}>{exercise.name}</span>
        {ssText && (
          <span className={styles.superset} style={ssColor ? { '--ss-color': ssColor } : undefined}>
            {ssText}
          </span>
        )}
        <span className={styles.summary}>
          {doneSets}/{totalSets}
        </span>
      </div>
      <div className={styles.body}>
        {exercise.notes && <p className={styles.notes}>{exercise.notes}</p>}
        {totalSets > 0 && (
          <>
            <HistorySetRowHeader />
            <div className={styles.sets}>
              {exercise.sets.map((set, setIndex) => (
                <HistorySetRow key={setIndex} set={set} index={setIndex} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const HistoryExerciseItem = memo(HistoryExerciseItemImpl)
