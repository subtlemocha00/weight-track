import { Fragment, useCallback, useEffect, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { saveSession } from '../../services/workoutSessions'
import { getRoutine, saveRoutine } from '../../services/routines'
import { listCustomExercises } from '../../services/customExercises'
import { applySessionToRoutine } from './applyToRoutine'
import { sessionReducer } from './sessionReducer'
import { SessionExerciseItem } from './SessionExerciseItem'
import { AddExercisePanel } from '../routines/AddExercisePanel'
import { getSupersetCount, supersetColor, supersetLabel } from '../../utils/supersets'
import { ElapsedTime } from './ElapsedTime'
import { writeActiveWorkout, clearActiveWorkout } from '../../utils/activeWorkout'
import { useConfirm } from '../../hooks/useConfirm'
import { AppHeader } from '../../components/AppHeader'
import styles from './SessionEditor.module.css'

export function SessionEditor({ initialSession }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { confirm } = useConfirm()

  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)
  // Loaded so the add-exercise picker can search the user's custom library in
  // addition to the built-in one. Non-fatal if it fails — the built-in library
  // still works.
  const [customExercises, setCustomExercises] = useState([])

  const isCompleted = session.status === 'completed'
  const isActive = !isCompleted && !finishing
  const supersetCount = getSupersetCount(session.exercises)

  // Autosave every state change to localStorage for crash recovery. This also
  // persists exercises added/removed mid-workout, so they survive refresh.
  useEffect(() => {
    writeActiveWorkout(session)
  }, [session])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listCustomExercises(user.uid)
      .then((list) => {
        if (!cancelled) setCustomExercises(list)
      })
      .catch(() => {
        // Non-fatal: built-in exercises remain searchable.
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // Warn on browser close / tab close / hard refresh while workout is active
  useBeforeUnload(isActive)

  const handleFinish = useCallback(async () => {
    if (!user || isCompleted) return
    setError(null)
    setFinishing(true)

    const completedAt = Date.now()
    const finalized = {
      ...session,
      status: 'completed',
      completedAt
    }
    dispatch({ type: 'FINISH', completedAt })

    try {
      await saveSession(user.uid, finalized)
      // Workout is safely persisted — clear the local recovery state
      clearActiveWorkout()

      const confirmed = await confirm({
        title: 'Update routine?',
        message: 'Apply the changes made during this workout back to the original routine?',
        confirmLabel: 'Update',
        cancelLabel: 'Skip'
      })

      if (confirmed) {
        const sourceRoutine = await getRoutine(user.uid, finalized.routineId)
        if (sourceRoutine) {
          const updatedRoutine = applySessionToRoutine(sourceRoutine, finalized)
          await saveRoutine(user.uid, updatedRoutine)
        }
      }

      navigate('/home', { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to finish workout. Try again — your progress is saved.')
      setFinishing(false)
    }
  }, [user, isCompleted, session, navigate])

  const handleBack = useCallback(async () => {
    if (isActive) {
      const ok = await confirm({
        title: 'Leave workout?',
        message: 'Your progress is saved — resume from the home screen at any time.',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay'
      })
      if (!ok) return
    }
    navigate('/home')
  }, [isActive, navigate, confirm])

  const handleAddExercise = useCallback((exercise) => {
    // Affects the active session only — the source routine is never touched here.
    dispatch({ type: 'ADD_EXERCISE', exercise })
  }, [])

  const handleAssignSuperset = useCallback((index, supersetId) => {
    dispatch({ type: 'ASSIGN_SUPERSET', index, supersetId })
  }, [])

  const handleRemoveExercise = useCallback(
    async (index) => {
      const target = session.exercises[index]
      const ok = await confirm({
        title: 'Remove exercise?',
        message: `"${target?.name || 'This exercise'}" will be removed from this workout. Your saved routine is not affected.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true
      })
      if (!ok) return
      dispatch({ type: 'REMOVE_EXERCISE', index })
    },
    [session.exercises, confirm]
  )

  return (
    <div className={styles.editor}>
      <AppHeader onBack={handleBack} />

      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.routineName}>
            {session.routineName || 'Workout'}
          </span>
          <span className={styles.subline}>
            <ElapsedTime
              startedAt={session.startedAt}
              completedAt={session.completedAt}
            />
            {isCompleted && ' · completed'}
          </span>
        </div>
        <button
          type="button"
          className={styles.finish}
          onClick={handleFinish}
          disabled={finishing || isCompleted}
        >
          {finishing ? 'Finishing…' : isCompleted ? 'Done' : 'Finish workout'}
        </button>
      </div>

      {isCompleted && (
        <div className={styles.banner}>
          This workout is completed and saved. It can no longer be edited.
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {isActive && (
        <AddExercisePanel
          onAdd={handleAddExercise}
          customExercises={customExercises}
        />
      )}

      {session.exercises.length === 0 ? (
        <div className={styles.empty}>
          {isActive
            ? 'No exercises yet. Use the panel above to add some.'
            : 'This workout has no exercises to log.'}
        </div>
      ) : (
        <div className={styles.exercises}>
          {session.exercises.map((exercise, index) => {
            // Render a superset group banner whenever a run of exercises sharing
            // a superset begins (id differs from the previous card's). Keeps
            // grouping obvious without reordering or a layout redesign.
            const prev = session.exercises[index - 1]
            const ssId = exercise.supersetId ?? null
            const showGroupHeader = ssId !== null && ssId !== (prev?.supersetId ?? null)
            const groupColor = supersetColor(ssId)

            return (
            <Fragment key={exercise.exerciseId + '-' + index}>
              {showGroupHeader && (
                <div
                  className={styles.supersetBanner}
                  style={{ '--ss-color': groupColor }}
                >
                  {supersetLabel(ssId)}
                </div>
              )}
            <SessionExerciseItem
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === session.exercises.length - 1}
              readOnly={isCompleted}
              supersetCount={supersetCount}
              onMoveUp={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index - 1 })
              }
              onMoveDown={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index + 1 })
              }
              onRemove={() => handleRemoveExercise(index)}
              onAssignSuperset={(supersetId) => handleAssignSuperset(index, supersetId)}
              onUpdateSet={(setIndex, patch) =>
                dispatch({
                  type: 'UPDATE_SET',
                  exerciseIndex: index,
                  setIndex,
                  patch
                })
              }
              onToggleSetCompleted={(setIndex) =>
                dispatch({
                  type: 'TOGGLE_SET_COMPLETED',
                  exerciseIndex: index,
                  setIndex
                })
              }
              onSetUnit={(unit) =>
                dispatch({ type: 'SET_EXERCISE_UNIT', index, unit })
              }
            />
            </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
