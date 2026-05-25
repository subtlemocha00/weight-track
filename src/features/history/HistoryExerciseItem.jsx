import { memo } from 'react'
import { HistorySetRow, HistorySetRowHeader } from './HistorySetRow'
import { countCompletedSets } from './formatSession'
import styles from './HistoryExerciseItem.module.css'

function HistoryExerciseItemImpl({ exercise, index }) {
  const totalSets = exercise.sets?.length ?? 0
  const doneSets = countCompletedSets(exercise)

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={styles.order}>{index + 1}.</span>
        <span className={styles.name}>{exercise.name}</span>
        {exercise.supersetGroup && (
          <span className={styles.superset}>SS {exercise.supersetGroup}</span>
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
