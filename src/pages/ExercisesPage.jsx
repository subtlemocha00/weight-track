import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConfirm } from '../hooks/useConfirm'
import { AppHeader } from '../components/AppHeader'
import { readActiveWorkout, writeActiveWorkout } from '../utils/activeWorkout'
import { readRoutineDraft, writeRoutineDraft } from '../utils/routineDraft'
import { swapSessionExercise } from '../features/workoutSessions/swapExercise'
import { legacyWorkoutPath } from '../features/workoutSessions/workoutNavigation'
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
import { getRoutine, listRoutines, saveRoutine } from '../services/routines'
import { createRoutineExercise } from '../features/routines/routineFactory'
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
  const location = useLocation()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  // Present when the library was opened from an active workout's "Swap Exercise"
  // button. Carries which session/exercise is being replaced. Absent otherwise,
  // so the page behaves as the normal Exercise Library.
  const swap = location.state?.swap ?? null

  const [filters, setFilters] = useState(INITIAL_FILTERS)
  // Custom exercises are loaded once per session and kept in state, so every
  // keystroke filters in-memory with no further Firestore reads.
  const [customExercises, setCustomExercises] = useState([])
  // Routines populate each card's "Add to routine" dropdown. Only id + name are
  // needed here; the append always re-fetches the routine fresh before saving,
  // so this cached list never goes stale in a way that matters.
  const [routines, setRoutines] = useState([])

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

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listRoutines(user.uid)
      .then((list) => {
        if (!cancelled) setRoutines(list)
      })
      .catch(() => {
        // Non-fatal: the "Add to routine" dropdown just shows no routines.
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

  // Append an exercise to the end of an existing routine and persist it. The
  // routine is re-fetched fresh so a concurrently edited routine isn't clobbered
  // by stale cached data, then the new exercise (default sets/reps via the same
  // factory the routine builder uses) is added last and saved. The user fills in
  // sets/reps/weight later inside the routine page as usual.
  const handleAddToRoutine = useCallback(
    async (exercise, routineId) => {
      if (!user) return
      const routine = await getRoutine(user.uid, routineId)
      if (!routine) throw new Error('That routine no longer exists.')
      const exercises = Array.isArray(routine.exercises) ? routine.exercises : []
      const updated = {
        ...routine,
        exercises: [...exercises, createRoutineExercise(exercise, exercises.length)]
      }
      const saved = await saveRoutine(user.uid, updated)
      // Keep the cached list ordered like Home (most-recently-updated first) so
      // the dropdown reflects the new order without a re-read.
      setRoutines((prev) => [
        { id: saved.id, name: saved.name },
        ...prev.filter((r) => r.id !== saved.id)
      ])
    },
    [user]
  )

  // Where "back" and a completed swap return to. Both swap kinds now carry an
  // explicit returnTo, because a workout can be run from either the routine
  // route or the legacy session route and only the caller knows which. The
  // fallback covers a swap started before that field existed.
  const swapReturnTo = swap
    ? (swap.returnTo ?? legacyWorkoutPath(swap.sessionId))
    : null

  // Backing out of a routine swap still passes fromSwap so any unsaved edits
  // stashed on the way in are restored losslessly.
  const returnFromSwap = useCallback(() => {
    if (!swap) return
    if (swap.kind === 'routine') {
      navigate(swapReturnTo, { state: { fromSwap: true } })
    } else {
      navigate(swapReturnTo)
    }
  }, [swap, swapReturnTo, navigate])

  // Swap flow: confirm with an app-styled modal, then replace only the exercise
  // identity (exerciseId + name) on the stashed session/routine — kept in
  // localStorage while the source page is unmounted — and return to it. Every
  // logged/configured value (sets, reps, weights, notes, superset, completion)
  // is preserved by swapSessionExercise, which only rewrites the two identity
  // fields regardless of whether the target is a workout session or a routine.
  const handleSelectForSwap = useCallback(
    async (exercise) => {
      if (!swap) return
      const ok = await confirm({
        title: 'Swap exercise?',
        message: `Replace "${swap.fromName}" with "${exercise.name}"?`,
        confirmLabel: 'Swap',
        cancelLabel: 'Cancel'
      })
      if (!ok) return

      if (swap.kind === 'routine') {
        const draft = readRoutineDraft()
        if (draft) {
          const updated = swapSessionExercise(draft.routine, swap.exerciseIndex, exercise)
          writeRoutineDraft({ ...draft, routine: updated })
        }
        // fromSwap rehydrates the draft in the editor whether or not it existed.
        navigate(swapReturnTo, { state: { fromSwap: true }, replace: true })
        return
      }

      const active = readActiveWorkout()
      if (!active || active.id !== swap.sessionId) {
        // The workout is no longer the active in-progress session (finished or
        // cleared elsewhere). Don't touch anything — just head back to it.
        navigate(swapReturnTo, { replace: true })
        return
      }

      const updated = swapSessionExercise(active, swap.exerciseIndex, exercise)
      writeActiveWorkout(updated)
      navigate(swapReturnTo, { replace: true })
    },
    [swap, swapReturnTo, confirm, navigate]
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
      <AppHeader
        title={swap ? 'Swap Exercise' : 'Exercises'}
        onBack={swap ? returnFromSwap : undefined}
      />

      {swap && (
        <div className={styles.swapBanner}>
          Choosing a replacement for <strong>{swap.fromName}</strong>. Search or
          browse, then pick an exercise — your sets, reps and{' '}
          {swap.kind === 'routine' ? 'notes' : 'progress'} are kept.
        </div>
      )}

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
              <ExerciseCard
                exercise={exercise}
                onEdit={handleEdit}
                routines={swap ? undefined : routines}
                onAddToRoutine={swap ? undefined : handleAddToRoutine}
                onSelect={swap ? handleSelectForSwap : undefined}
                selectLabel="Select"
              />
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
