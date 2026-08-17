import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { useConfirm } from '../../hooks/useConfirm'
import { useCustomExercises } from '../../hooks/useCustomExercises'
import { deleteRoutine, duplicateRoutine, saveRoutine } from '../../services/routines'
import { resolveExerciseById } from '../../services/exercises'
import { readRoutineDraft, writeRoutineDraft, clearRoutineDraft } from '../../utils/routineDraft'
import { AppHeader } from '../../components/AppHeader'
import { downloadRoutineExport } from './exportRoutine'
import { AddExercisePanel } from './AddExercisePanel'
import { RoutineExerciseItem } from './RoutineExerciseItem'
import { routineReducer } from './routineReducer'
import { getSupersetCount } from '../../utils/supersets'
import styles from './RoutineEditor.module.css'

export function RoutineEditor({ initialRoutine, mode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [routine, dispatch] = useReducer(routineReducer, initialRoutine)
  // Loaded once so an exercise's instructions (which live on the exercise
  // database, not on the routine template) can be resolved for both built-in
  // and custom exercises, and so the add-exercise picker can search the user's
  // custom library. Non-fatal if it fails — items just omit the panel.
  const customExercises = useCustomExercises()
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' })
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  // Track whether this is the initial mount dispatch (LOAD after save)
  const suppressDirty = useRef(false)

  const { confirm } = useConfirm()
  const isNew = mode === 'new'
  const canSave = routine.name.trim().length > 0 && saveState.status !== 'saving'
  const supersetCount = getSupersetCount(routine.exercises)

  // Warn on browser close / refresh when there are unsaved changes
  useBeforeUnload(isDirty)

  // Rehydrate a stashed routine draft when returning from the Exercise Library's
  // "Swap Exercise" round-trip. The draft carries any unsaved edits plus the
  // applied swap (or just the unsaved edits if the user backed out), so nothing
  // entered before the swap is lost. Mirrors the active-workout swap, which
  // round-trips its state through localStorage the same way.
  useEffect(() => {
    if (location.state?.fromSwap) {
      const draft = readRoutineDraft()
      // For a saved routine, match on id so a stale draft can't load into the
      // wrong routine. A brand-new routine has no persisted identity yet, so the
      // mode match alone is enough (only one can be in progress at a time).
      if (
        draft &&
        draft.mode === mode &&
        (mode === 'new' || draft.routineId === initialRoutine.id)
      ) {
        dispatch({ type: 'LOAD', routine: draft.routine })
        setIsDirty(true)
      }
    }
    // Always clear on mount: a consumed draft is spent, and a stale one left by an
    // abandoned swap must never rehydrate into an unrelated edit session later.
    clearRoutineDraft()
  }, [location.state, mode, initialRoutine.id])

  const dirtyDispatch = useCallback(
    (action) => {
      dispatch(action)
      // LOAD is dispatched after a successful save — don't mark dirty
      if (action.type !== 'LOAD' && !suppressDirty.current) {
        setIsDirty(true)
      }
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaveState({ status: 'saving', message: 'Saving…' })
    try {
      const saved = await saveRoutine(user.uid, {
        ...routine,
        name: routine.name.trim()
      })
      suppressDirty.current = true
      dispatch({ type: 'LOAD', routine: saved })
      suppressDirty.current = false
      setIsDirty(false)
      setSaveState({ status: 'saved', message: 'Saved' })
      if (isNew) {
        navigate(`/routine/${saved.id}`, { replace: true })
      }
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Save failed.'
      })
    }
  }, [user, routine, isNew, navigate])

  const handleDelete = useCallback(async () => {
    if (!user || isNew) return
    const ok = await confirm({
      title: 'Delete routine?',
      message: `"${routine.name || 'This routine'}" will be permanently deleted and cannot be recovered.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteRoutine(user.uid, routine.id)
      navigate('/home', { replace: true })
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Delete failed.'
      })
      setDeleting(false)
    }
  }, [user, isNew, routine.id, routine.name, navigate, confirm])

  const handleDuplicate = useCallback(async () => {
    if (!user || isNew || duplicating) return
    setSaveState({ status: 'idle', message: '' })
    setDuplicating(true)
    try {
      // Copies the routine as currently shown (single write, no re-fetch). On
      // failure nothing is created and the user stays on the original.
      const created = await duplicateRoutine(user.uid, routine)
      navigate(`/routine/${created.id}`)
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Could not duplicate this routine.'
      })
      setDuplicating(false)
    }
  }, [user, isNew, duplicating, routine, navigate])

  const handleExport = useCallback(() => {
    if (isNew) return
    try {
      // Exports the routine as currently shown — a single pass over the
      // in-memory object, no Firestore read.
      downloadRoutineExport(routine)
      setSaveState({ status: 'idle', message: '' })
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Could not export this routine.'
      })
    }
  }, [isNew, routine])

  const handleBack = useCallback(async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Unsaved changes',
        message: 'Leave without saving your changes?',
        confirmLabel: 'Leave',
        cancelLabel: 'Keep editing'
      })
      if (!ok) return
    }
    navigate('/home')
  }, [isDirty, navigate, confirm])

  const handleAddExercise = useCallback((exercise) => {
    dirtyDispatch({ type: 'ADD_EXERCISE', exercise })
  }, [dirtyDispatch])

  const handleSwapExercise = useCallback(
    (index) => {
      // Stash the full in-progress routine (including any unsaved edits) so the
      // Exercise Library can apply the swap and hand it back on return — the same
      // round-trip the active-workout swap makes through localStorage. `returnTo`
      // for a new routine is /routine/new (its id isn't in Firestore yet); the
      // draft restores the real in-progress identity on the way back.
      const target = routine.exercises[index]
      writeRoutineDraft({ mode, routineId: routine.id, routine })
      navigate('/exercises', {
        state: {
          swap: {
            kind: 'routine',
            exerciseIndex: index,
            fromName: target?.name || 'this exercise',
            returnTo: mode === 'new' ? '/routine/new' : `/routine/${routine.id}`
          }
        }
      })
    },
    [routine, mode, navigate]
  )

  const saveMsgClass = [
    styles.saveMsg,
    saveState.status === 'error' && styles.saveMsgError,
    saveState.status === 'saved' && styles.saveMsgOk
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.editor}>
      <AppHeader onBack={handleBack}>
        {!isNew && (
          <button
            type="button"
            className={styles.duplicate}
            onClick={handleDuplicate}
            disabled={duplicating || deleting}
          >
            {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
        )}
        {!isNew && (
          <button
            type="button"
            className={styles.export}
            onClick={handleExport}
            disabled={duplicating || deleting}
          >
            Export
          </button>
        )}
        {!isNew && (
          <button
            type="button"
            className={styles.delete}
            onClick={handleDelete}
            disabled={deleting || duplicating}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
        <button
          type="button"
          className={styles.save}
          onClick={handleSave}
          disabled={!canSave}
        >
          {saveState.status === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </AppHeader>

      {saveState.message && (
        <div className={styles.saveStatus}>
          <span className={saveMsgClass}>{saveState.message}</span>
        </div>
      )}

      <label className={styles.nameField}>
        <span className={styles.nameLabel}>Routine name</span>
        <input
          className={styles.nameInput}
          type="text"
          value={routine.name}
          onChange={(e) => dirtyDispatch({ type: 'SET_NAME', name: e.target.value })}
          placeholder="e.g. Push Day"
          maxLength={80}
          autoFocus={isNew}
        />
      </label>

      <AddExercisePanel
        onAdd={handleAddExercise}
        customExercises={customExercises}
      />

      {routine.exercises.length === 0 ? (
        <div className={styles.empty}>
          No exercises yet. Use the panel above to add some.
        </div>
      ) : (
        <div className={styles.exercises}>
          {routine.exercises.map((exercise, index) => {
            const resolved = resolveExerciseById(exercise.exerciseId, customExercises)
            return (
            <RoutineExerciseItem
              key={`${exercise.exerciseId}-${index}`}
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === routine.exercises.length - 1}
              supersetCount={supersetCount}
              instructions={resolved?.instructions ?? []}
              videoUrl={resolved?.videoUrl ?? null}
              onRemove={() => dirtyDispatch({ type: 'REMOVE_EXERCISE', index })}
              onMoveUp={() =>
                dirtyDispatch({ type: 'MOVE_EXERCISE', from: index, to: index - 1 })
              }
              onMoveDown={() =>
                dirtyDispatch({ type: 'MOVE_EXERCISE', from: index, to: index + 1 })
              }
              onAddSet={() => dirtyDispatch({ type: 'ADD_SET', index })}
              onRemoveSet={(setIndex) =>
                dirtyDispatch({
                  type: 'REMOVE_SET',
                  exerciseIndex: index,
                  setIndex
                })
              }
              onUpdateSet={(setIndex, patch) =>
                dirtyDispatch({
                  type: 'UPDATE_SET',
                  exerciseIndex: index,
                  setIndex,
                  patch
                })
              }
              onUpdateNotes={(notes) =>
                dirtyDispatch({ type: 'UPDATE_EXERCISE_NOTES', index, notes })
              }
              onAssignSuperset={(supersetId) =>
                dirtyDispatch({ type: 'ASSIGN_SUPERSET', index, supersetId })
              }
              onSwap={() => handleSwapExercise(index)}
              onUpdateAllUnits={(unit) =>
                exercise.sets.forEach((_, setIndex) =>
                  dirtyDispatch({
                    type: 'UPDATE_SET',
                    exerciseIndex: index,
                    setIndex,
                    patch: { unit }
                  })
                )
              }
            />
            )
          })}
        </div>
      )}
    </div>
  )
}
