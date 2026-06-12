import { memo } from 'react'
import { WatchVideoButton } from './WatchVideoButton'
import styles from './ExerciseCard.module.css'

function ExerciseCardImpl({ exercise, onEdit }) {
  const isCustom = exercise.source === 'custom'
  const primaryMuscle = exercise.targetMuscles[0] ?? null
  const canEdit = isCustom && typeof onEdit === 'function'

  return (
    <details className={styles.card}>
      <summary className={styles.summary}>
        <div className={styles.summaryContent}>
          <span className={styles.name}>{exercise.name}</span>
          <div className={styles.meta}>
            {isCustom && (
              <span className={`${styles.metaItem} ${styles.customBadge}`}>
                Custom
              </span>
            )}
            {exercise.bodyPart && (
              <span className={styles.metaItem}>{exercise.bodyPart}</span>
            )}
            {exercise.equipment && (
              <span className={styles.metaItem}>{exercise.equipment}</span>
            )}
            {primaryMuscle && (
              <span className={styles.metaItem}>{primaryMuscle}</span>
            )}
          </div>
        </div>
        <span className={styles.expandIcon} aria-hidden="true">+</span>
      </summary>

      <div className={styles.body}>
        {exercise.secondaryMuscles.length > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Secondary</span>
            <span>{exercise.secondaryMuscles.join(', ')}</span>
          </div>
        )}

        {exercise.difficulty && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Difficulty</span>
            <span style={{ textTransform: 'capitalize' }}>{exercise.difficulty}</span>
          </div>
        )}

        {exercise.instructions.length > 0 && (
          <ol className={styles.instructions}>
            {exercise.instructions.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        )}

        <WatchVideoButton exercise={exercise} />

        {canEdit && (
          <button
            type="button"
            className={styles.edit}
            onClick={() => onEdit(exercise)}
          >
            Edit exercise
          </button>
        )}
      </div>
    </details>
  )
}

export const ExerciseCard = memo(ExerciseCardImpl)
