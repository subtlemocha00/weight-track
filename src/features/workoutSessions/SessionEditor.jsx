import { useCallback, useEffect, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { saveSession } from '../../services/workoutSessions'
import { getRoutine, saveRoutine } from '../../services/routines'
import { applySessionToRoutine } from './applyToRoutine'
import { sessionReducer } from './sessionReducer'
import { SessionExerciseItem } from './SessionExerciseItem'
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

  const isCompleted = session.status === 'completed'
  const isActive = !isCompleted && !finishing

  // Autosave every state change to localStorage for crash recovery
  useEffect(() => {
    writeActiveWorkout(session)
  }, [session])

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

      {session.exercises.length === 0 ? (
        <div className={styles.empty}>
          This routine has no exercises to log.
        </div>
      ) : (
        <div className={styles.exercises}>
          {session.exercises.map((exercise, index) => (
            <SessionExerciseItem
              key={exercise.exerciseId + '-' + index}
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === session.exercises.length - 1}
              readOnly={isCompleted}
              onMoveUp={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index - 1 })
              }
              onMoveDown={() =>
                dispatch({ type: 'MOVE_EXERCISE', from: index, to: index + 1 })
              }
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
          ))}
        </div>
      )}
    </div>
  )
}
