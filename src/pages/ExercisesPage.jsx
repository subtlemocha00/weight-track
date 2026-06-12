import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import {
  filterAllExercises,
  getCombinedFilterOptions
} from '../services/exercises'
import {
  listCustomExercises,
  saveCustomExercise
} from '../services/customExercises'
import { ExerciseCard } from '../features/exercises/ExerciseCard'
import { ExerciseFilters } from '../features/exercises/ExerciseFilters'
import { CustomExerciseEditor } from '../features/exercises/CustomExerciseEditor'
import styles from './ExercisesPage.module.css'

const INITIAL_FILTERS = {
  query: '',
  bodyPart: '',
  muscle: '',
  equipment: '',
  difficulty: ''
}

export function ExercisesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  // Custom exercises are loaded once per session and kept in state, so every
  // keystroke filters in-memory with no further Firestore reads.
  const [customExercises, setCustomExercises] = useState([])

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listCustomExercises(user.uid)
      .then((list) => {
        if (!cancelled) setCustomExercises(list)
      })
      .catch(() => {
        // Non-fatal: the library still shows built-in exercises.
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const options = useMemo(
    () => getCombinedFilterOptions(customExercises),
    [customExercises]
  )

  const results = useMemo(
    () => filterAllExercises(filters, customExercises),
    [filters, customExercises]
  )

  const update = (key) => (value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const hasAnyFilter = Object.values(filters).some(Boolean)

  const handleEdit = useCallback((exercise) => {
    setSaveError('')
    setEditing(exercise)
  }, [])

  const handleCancelEdit = useCallback(() => {
    if (!saving) setEditing(null)
  }, [saving])

  const handleSaveEdit = useCallback(
    async (updated) => {
      if (!user) return
      setSaving(true)
      setSaveError('')
      try {
        const saved = await saveCustomExercise(user.uid, updated)
        // Update the cached list in place so the library + filters reflect the
        // edit immediately, without re-reading Firestore.
        setCustomExercises((prev) =>
          prev.map((e) => (e.id === saved.id ? saved : e))
        )
        setEditing(null)
      } catch (err) {
        setSaveError(err?.message || 'Failed to save changes.')
      } finally {
        setSaving(false)
      }
    },
    [user]
  )

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
              <ExerciseCard exercise={exercise} onEdit={handleEdit} />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CustomExerciseEditor
          exercise={editing}
          options={options}
          saving={saving}
          error={saveError}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </section>
  )
}
