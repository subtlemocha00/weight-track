import { useCallback, useEffect, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { useCustomExercises } from '../../hooks/useCustomExercises'
import { resolveExerciseById } from '../../services/exercises'
import {
  applyFinishedSessionToRoutine,
  persistFinishedSession
} from './finishWorkout'
import { sessionReducer } from './sessionReducer'
import { SessionExerciseItem } from './SessionExerciseItem'
import { AddExercisePanel } from '../routines/AddExercisePanel'
import { getSupersetCount } from '../../utils/supersets'
import { ElapsedTime } from './ElapsedTime'
import { writeActiveWorkout } from '../../utils/activeWorkout'
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
  const customExercises = useCustomExercises()

  const isCompleted = session.status === 'completed'
  const isActive = !isCompleted && !finishing
  const supersetCount = getSupersetCount(session.exercises)

  // Autosave every state change to localStorage for crash recovery. This also
  // persists exercises added/removed mid-workout, so they survive refresh.
  useEffect(() => {
    writeActiveWorkout(session)
  }, [session])

  // Warn on browser close / tab close / hard refresh while workout is active
  useBeforeUnload(isActive)

  const handleFinish = useCallback(async () => {
    if (!user || isCompleted || finishing) return
    setError(null)
    setFinishing(true)

    // Save first. Until Firestore acknowledges the write, nothing here marks the
    // workout completed and nothing clears the local recovery copy.
    let finalized
    try {
      finalized = await persistFinishedSession(user.uid, session)
    } catch {
      // Nothing changed: the session is still in progress, wt-active-workout is
      // intact, and the Finish button re-enables so the user can retry. Retrying
      // rewrites the same document id rather than creating a second one.
      setError(
        'Could not save your workout. Your progress has been kept — check your connection and try again.'
      )
      setFinishing(false)
      return
    }

    // Persisted — only now is it safe to complete the local state.
    dispatch({ type: 'FINISH', completedAt: finalized.completedAt })

    try {
      const confirmed = await confirm({
        title: 'Update routine?',
        message: 'Apply the changes made during this workout back to the original routine?',
        confirmLabel: 'Update',
        cancelLabel: 'Skip'
      })

      if (confirmed) {
        await applyFinishedSessionToRoutine(user.uid, finalized)
      }
    } catch {
      // The workout itself is saved; only the optional routine update failed, so
      // say exactly that and stay put rather than reporting a lost workout.
      setError('Your workout was saved, but the routine could not be updated.')
      setFinishing(false)
      return
    }

    navigate('/home', { replace: true })
  }, [user, isCompleted, finishing, session, navigate, confirm])

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

  const handleSwapExercise = useCallback(
    (index) => {
      // Send the user to the existing Exercise Library in "swap mode". The live
      // session is already autosaved to localStorage on every change, so the
      // library reads it, swaps the exercise's identity, writes it back, and
      // navigates here again — no session state needs to travel through the URL.
      const target = session.exercises[index]
      navigate('/exercises', {
        state: {
          swap: {
            sessionId: session.id,
            exerciseIndex: index,
            fromName: target?.name || 'this exercise'
          }
        }
      })
    },
    [session.exercises, session.id, navigate]
  )

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
      <AppHeader onBack={handleBack}>
        <button
          type="button"
          className={styles.finish}
          onClick={handleFinish}
          disabled={finishing || isCompleted}
        >
          {finishing ? 'Finishing…' : isCompleted ? 'Done' : 'Finish workout'}
        </button>
      </AppHeader>

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
            const resolved = resolveExerciseById(exercise.exerciseId, customExercises)

            return (
            <SessionExerciseItem
              key={`${exercise.exerciseId}-${index}`}
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === session.exercises.length - 1}
              readOnly={isCompleted}
              instructions={resolved?.instructions ?? []}
              videoUrl={resolved?.videoUrl ?? null}
              supersetCount={supersetCount}
              onMoveUp={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index - 1 })
              }
              onMoveDown={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index + 1 })
              }
              onRemove={() => handleRemoveExercise(index)}
              onSwap={() => handleSwapExercise(index)}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
