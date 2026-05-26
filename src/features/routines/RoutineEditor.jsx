import { useCallback, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { deleteRoutine, saveRoutine } from '../../services/routines'
import { AddExercisePanel } from './AddExercisePanel'
import { RoutineExerciseItem } from './RoutineExerciseItem'
import { routineReducer } from './routineReducer'
import styles from './RoutineEditor.module.css'

export function RoutineEditor({ initialRoutine, mode }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [routine, dispatch] = useReducer(routineReducer, initialRoutine)
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' })
  const [deleting, setDeleting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  // Track whether this is the initial mount dispatch (LOAD after save)
  const suppressDirty = useRef(false)

  const isNew = mode === 'new'
  const canSave = routine.name.trim().length > 0 && saveState.status !== 'saving'

  // Warn on browser close / refresh when there are unsaved changes
  useBeforeUnload(isDirty)

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
    if (!window.confirm(`Delete "${routine.name || 'this routine'}"?`)) return
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
  }, [user, isNew, routine.id, routine.name, navigate])

  const handleBack = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Leave without saving?')
      if (!ok) return
    }
    navigate('/home')
  }, [isDirty, navigate])

  const handleAddExercise = useCallback((exercise) => {
    dirtyDispatch({ type: 'ADD_EXERCISE', exercise })
  }, [dirtyDispatch])

  const saveMsgClass = [
    styles.saveMsg,
    saveState.status === 'error' && styles.saveMsgError,
    saveState.status === 'saved' && styles.saveMsgOk
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.editor}>
      <div className={styles.headerRow}>
        <button type="button" className={styles.back} onClick={handleBack}>
          ← Back
        </button>
      </div>

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

      <AddExercisePanel onAdd={handleAddExercise} />

      {routine.exercises.length === 0 ? (
        <div className={styles.empty}>
          No exercises yet. Use the panel above to add some.
        </div>
      ) : (
        <div className={styles.exercises}>
          {routine.exercises.map((exercise, index) => (
            <RoutineExerciseItem
              key={`${exercise.exerciseId}-${index}`}
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === routine.exercises.length - 1}
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
              onUpdateSupersetGroup={(group) =>
                dirtyDispatch({ type: 'UPDATE_SUPERSET_GROUP', index, group })
              }
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
          ))}
        </div>
      )}

      <div className={styles.actions}>
        {saveState.message && (
          <span className={saveMsgClass}>{saveState.message}</span>
        )}
        {!isNew && (
          <button
            type="button"
            className={styles.delete}
            onClick={handleDelete}
            disabled={deleting}
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
      </div>
    </div>
  )
}
