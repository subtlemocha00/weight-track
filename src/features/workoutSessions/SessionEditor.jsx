import { useCallback, useReducer, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { saveSession } from '../../services/workoutSessions'
import { getRoutine, saveRoutine } from '../../services/routines'
import { applySessionToRoutine } from './applyToRoutine'
import { sessionReducer } from './sessionReducer'
import { SessionExerciseItem } from './SessionExerciseItem'
import { ElapsedTime } from './ElapsedTime'
import styles from './SessionEditor.module.css'

export function SessionEditor({ initialSession }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)

  const isCompleted = session.status === 'completed'

  const handleFinish = useCallback(async () => {
    if (!user || isCompleted) return
    setError(null)
    setFinishing(true)

    // Step 1: mark completed in local state.
    const completedAt = Date.now()
    const finalized = {
      ...session,
      status: 'completed',
      completedAt
    }
    dispatch({ type: 'FINISH', completedAt })

    try {
      // Step 2: persist the finalized session.
      await saveSession(user.uid, finalized)

      // Step 3: ask if the user wants to update the source routine.
      const confirmed = window.confirm(
        'Update routine with changes made during workout?'
      )

      if (confirmed) {
        const sourceRoutine = await getRoutine(user.uid, finalized.routineId)
        if (sourceRoutine) {
          const updatedRoutine = applySessionToRoutine(sourceRoutine, finalized)
          await saveRoutine(user.uid, updatedRoutine)
        }
      }

      navigate('/home', { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to finish workout.')
      setFinishing(false)
    }
  }, [user, isCompleted, session, navigate])

  return (
    <div className={styles.editor}>
      <div className={styles.backRow}>
        <Link to="/home" className={styles.back}>
          ← Home
        </Link>
      </div>

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
