import { memo } from 'react'
import styles from './ExerciseCard.module.css'

function ExerciseCardImpl({ exercise }) {
  const primaryMuscle = exercise.targetMuscles[0] ?? '—'

  return (
    <details className={styles.card}>
      <summary className={styles.summary}>
        <div className={styles.summaryContent}>
          <span className={styles.name}>{exercise.name}</span>
          <div className={styles.meta}>
            <span className={styles.metaItem}>{exercise.bodyPart}</span>
            <span className={styles.metaItem}>{exercise.equipment}</span>
            <span className={styles.metaItem}>{primaryMuscle}</span>
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
      </div>
    </details>
  )
}

export const ExerciseCard = memo(ExerciseCardImpl)
