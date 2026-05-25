import { useMemo, useState } from 'react'
import {
  filterExercises,
  getFilterOptions
} from '../../services/exercises'
import { ExerciseFilters } from '../exercises/ExerciseFilters'
import styles from './AddExercisePanel.module.css'

const INITIAL_FILTERS = {
  query: '',
  bodyPart: '',
  muscle: '',
  equipment: '',
  difficulty: ''
}

const MAX_RESULTS = 60

export function AddExercisePanel({ onAdd }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const options = useMemo(() => getFilterOptions(), [])

  const update = (key) => (value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const results = useMemo(() => filterExercises(filters), [filters])
  const visible = results.slice(0, MAX_RESULTS)

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        <span className={styles.summaryTitle}>+ Add exercises</span>
        <span className={styles.summaryHint}>Click to search</span>
      </summary>

      <div className={styles.body}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search exercises…"
          value={filters.query}
          onChange={(e) => update('query')(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />

        <ExerciseFilters
          options={options}
          bodyPart={filters.bodyPart}
          muscle={filters.muscle}
          equipment={filters.equipment}
          difficulty={filters.difficulty}
          onBodyPartChange={update('bodyPart')}
          onMuscleChange={update('muscle')}
          onEquipmentChange={update('equipment')}
          onDifficultyChange={update('difficulty')}
        />

        <p className={styles.count}>
          {results.length.toLocaleString()} results
          {results.length > MAX_RESULTS && ` — showing first ${MAX_RESULTS}`}
        </p>

        {visible.length === 0 ? (
          <div className={styles.empty}>No exercises match these filters.</div>
        ) : (
          <ul className={styles.list}>
            {visible.map((exercise) => {
              const primary = exercise.targetMuscles[0] ?? '—'
              return (
                <li key={exercise.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowName}>{exercise.name}</span>
                    <span className={styles.rowMeta}>
                      {exercise.bodyPart} · {exercise.equipment} · {primary}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.add}
                    onClick={() => onAdd(exercise)}
                  >
                    Add
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
