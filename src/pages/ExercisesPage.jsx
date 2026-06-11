import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { filterExercises, getFilterOptions } from '../services/exercises'
import { ExerciseCard } from '../features/exercises/ExerciseCard'
import { ExerciseFilters } from '../features/exercises/ExerciseFilters'
import styles from './ExercisesPage.module.css'

const INITIAL_FILTERS = {
  query: '',
  bodyPart: '',
  muscle: '',
  equipment: '',
  difficulty: ''
}

export function ExercisesPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const options = useMemo(() => getFilterOptions(), [])

  const results = useMemo(() => filterExercises(filters), [filters])

  const update = (key) => (value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const hasAnyFilter = Object.values(filters).some(Boolean)

  return (
    <section className={styles.page}>
      <AppHeader title="Exercises" />

      <input
        className={styles.search}
        type="search"
        placeholder="Search exercises…"
        value={filters.query}
        onChange={(e) => update('query')(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
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

      <div className={styles.toolbar}>
        <span>{results.length.toLocaleString()} results</span>
        <button
          type="button"
          className={styles.reset}
          onClick={() => setFilters(INITIAL_FILTERS)}
          disabled={!hasAnyFilter}
        >
          Reset
        </button>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>No exercises match these filters.</div>
      ) : (
        <ul className={styles.list}>
          {results.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseCard exercise={exercise} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
