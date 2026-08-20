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
import { routineWorkoutNavigation } from './workoutNavigation'
import { sessionReducer } from './sessionReducer'
import { SessionExerciseItem } from './SessionExerciseItem'
import { AddExercisePanel } from '../routines/AddExercisePanel'
import { getSupersetCount } from '../../utils/supersets'
import { ElapsedTime } from './ElapsedTime'
import { pauseSession, resumeSession } from './workoutClock'
import { writeActiveWorkout } from '../../utils/activeWorkout'
import { discardActiveWorkout } from './discardActiveWorkout'
import { CONFIRM_ALT } from '../../contexts/ConfirmModalContext'
import { useConfirm } from '../../hooks/useConfirm'
import { AppHeader } from '../../components/AppHeader'
import styles from './SessionEditor.module.css'

export function SessionEditor({ initialSession }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { confirm } = useConfirm()

  // Entering a workout restarts its clock. Every way back into a running
  // workout mounts this editor, so resuming here covers Resume, the home
  // screen's recovery banner, a bookmarked ?workout=1 link and a refresh alike
  // — there is no path that could leave a session paused while it is on screen.
  // A session that was not paused comes back unchanged.
  const [session, dispatch] = useReducer(sessionReducer, initialSession, resumeSession)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)
  // Loaded so the add-exercise picker can search the user's custom library in
  // addition to the built-in one. Non-fatal if it fails — the built-in library
  // still works.
  const customExercises = useCustomExercises()

  // A workout is only ever shown on its routine's route, so its destinations
  // follow from the routine it belongs to. RoutineWorkoutContainer will not
  // mount this editor unless session.routineId matches the routine on screen.
  const { back: backTo, backReplace, swapReturnTo } =
    routineWorkoutNavigation(session.routineId)

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

  // Step out of the workout without ending it. The session stays live in the
  // recovery copy, so the routine page it lands on offers Resume straight away.
  // No confirmation: pressing Pause is already the deliberate act, and nothing
  // is lost by it.
  // Stopping the clock is written straight to the recovery copy rather than
  // dispatched: navigating unmounts this editor in the same commit, so the
  // autosave effect would never run for a state change made here. The routine
  // page then resolves the paused session from storage and shows the frozen
  // elapsed time beside Resume.
  const handlePause = useCallback(() => {
    writeActiveWorkout(pauseSession(session))
    navigate(backTo, { replace: backReplace })
  }, [session, navigate, backTo, backReplace])

  const discardWorkout = useCallback(() => {
    discardActiveWorkout(user?.uid, session.id)
    navigate('/home', { replace: true })
  }, [session.id, user, navigate])

  // Back ends the workout — Pause is what leaves it running. Three answers, so
  // the prompt carries a third button: Save finishes exactly as the Finish
  // button does, Discard throws the workout away, and dismissing (Cancel, ESC,
  // the backdrop) stays put. Dismissal can only ever mean stay.
  const handleBack = useCallback(async () => {
    if (!isActive) {
      navigate(backTo, { replace: backReplace })
      return
    }

    const answer = await confirm({
      title: 'End workout?',
      message:
        'Save this workout to your history, or discard it? Use Pause instead to leave it running.',
      confirmLabel: 'Save',
      altLabel: 'Discard',
      altDestructive: true,
      cancelLabel: 'Cancel'
    })

    if (answer === CONFIRM_ALT) {
      discardWorkout()
      return
    }
    if (answer) await handleFinish()
  }, [
    isActive,
    navigate,
    backTo,
    backReplace,
    confirm,
    discardWorkout,
    handleFinish
  ])

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
      // navigates back to returnTo — no session state travels through the URL.
      // returnTo is carried because only this side knows which route the
      // workout is being run from.
      const target = session.exercises[index]
      navigate('/exercises', {
        state: {
          swap: {
            sessionId: session.id,
            exerciseIndex: index,
            fromName: target?.name || 'this exercise',
            returnTo: swapReturnTo
          }
        }
      })
    },
    [session.exercises, session.id, navigate, swapReturnTo]
  )

  const handleAddSet = useCallback((index) => {
    dispatch({ type: 'ADD_SET', index })
  }, [])

  const handleRemoveSet = useCallback(
    async (exerciseIndex, setIndex) => {
      // An empty set holds nothing worth confirming — removing a logged one
      // destroys today's record of it, so that case asks first.
      const target = session.exercises[exerciseIndex]?.sets[setIndex]
      if (target?.completed) {
        const ok = await confirm({
          title: 'Remove logged set?',
          message: `Set ${setIndex + 1} is marked done. Removing it discards what you logged for it.`,
          confirmLabel: 'Remove',
          cancelLabel: 'Cancel',
          destructive: true
        })
        if (!ok) return
      }
      dispatch({ type: 'REMOVE_SET', exerciseIndex, setIndex })
    },
    [session.exercises, confirm]
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
        {isActive && (
          <button
            type="button"
            className={styles.pause}
            onClick={handlePause}
            title="Leave the workout running and go back to the routine"
          >
            ⏸ Pause
          </button>
        )}
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
            <ElapsedTime session={session} />
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
              onToggleSetCompleted={(setIndex, timestamp) =>
                dispatch({
                  type: 'TOGGLE_SET_COMPLETED',
                  exerciseIndex: index,
                  setIndex,
                  timestamp
                })
              }
              onSetUnit={(unit) =>
                dispatch({ type: 'SET_EXERCISE_UNIT', index, unit })
              }
              onAddSet={() => handleAddSet(index)}
              onRemoveSet={(setIndex) => handleRemoveSet(index, setIndex)}
            />
            )
          })}
        </div>
      )}
    </div>
  )
}
