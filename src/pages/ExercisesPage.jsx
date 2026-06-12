import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import {
  filterAllExercises,
  getCombinedFilterOptions,
  resolveExercise
} from '../services/exercises'
import {
  deleteCustomExercise,
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
  difficulty: '',
  source: ''
}

// Seed for the create modal — a blank exercise the editor can render. Identity
// fields (id, source, timestamps) are stamped by createCustomExercise on save,
// so they're intentionally absent here.
const BLANK_EXERCISE = {
  name: '',
  bodyPart: null,
  equipment: null,
  targetMuscles: [],
  secondaryMuscles: [],
  instructions: [],
  videoUrl: null
}

export function ExercisesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  // Custom exercises are loaded once per session and kept in state, so every
  // keystroke filters in-memory with no further Firestore reads.
  const [customExercises, setCustomExercises] = useState([])

  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [createError, setCreateError] = useState('')

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
    if (!saving && !deleting) setEditing(null)
  }, [saving, deleting])

  // Exact, case-insensitive, trimmed name match across the built-in library and
  // the user's custom library (resolveExercise checks both). `excludeId` lets an
  // edit keep its own name. Returns true when the name is already taken.
  const nameConflicts = useCallback(
    (name, excludeId = null) => {
      const result = resolveExercise(name, customExercises)
      if (!result.found) return false
      return result.exercise.id !== excludeId
    },
    [customExercises]
  )

  const handleSaveEdit = useCallback(
    async (updated) => {
      if (!user) return
      if (nameConflicts(updated.name, updated.id)) {
        setSaveError('An exercise with this name already exists.')
        return
      }
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
    [user, nameConflicts]
  )

  const handleCreate = useCallback(() => {
    setCreateError('')
    setCreating(true)
  }, [])

  const handleCancelCreate = useCallback(() => {
    if (!saving) setCreating(false)
  }, [saving])

  const handleSaveCreate = useCallback(
    async (draft) => {
      if (!user) return
      if (nameConflicts(draft.name)) {
        setCreateError('An exercise with this name already exists.')
        return
      }
      setSaving(true)
      setCreateError('')
      try {
        // saveCustomExercise runs the draft through createCustomExercise, which
        // stamps id/source/createdAt/updatedAt — the exact same path imports use.
        const saved = await saveCustomExercise(user.uid, draft)
        // Insert into the cached list so the library/search/filters pick it up
        // immediately; filterAllExercises re-sorts by name on every render.
        setCustomExercises((prev) => [...prev, saved])
        setCreating(false)
      } catch (err) {
        setCreateError(err?.message || 'Failed to create exercise.')
      } finally {
        setSaving(false)
      }
    },
    [user, nameConflicts]
  )

  const handleDeleteEdit = useCallback(
    async (target) => {
      if (!user || !target) return
      setDeleting(true)
      setSaveError('')
      try {
        await deleteCustomExercise(user.uid, target.id)
        // Drop it from the cached list so the library/search/filters update
        // immediately, then close the editor.
        setCustomExercises((prev) => prev.filter((e) => e.id !== target.id))
        setEditing(null)
      } catch (err) {
        setSaveError(err?.message || 'Failed to delete exercise.')
      } finally {
        setDeleting(false)
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
        source={filters.source}
        onBodyPartChange={update('bodyPart')}
        onMuscleChange={update('muscle')}
        onEquipmentChange={update('equipment')}
        onDifficultyChange={update('difficulty')}
        onSourceChange={update('source')}
      />

      <button
        type="button"
        className={styles.addCustom}
        onClick={handleCreate}
      >
        + Add Custom Exercise
      </button>

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
          deleting={deleting}
          error={saveError}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {creating && (
        <CustomExerciseEditor
          exercise={BLANK_EXERCISE}
          options={options}
          mode="create"
          saving={saving}
          error={createError}
          onSave={handleSaveCreate}
          onCancel={handleCancelCreate}
        />
      )}
    </section>
  )
}
