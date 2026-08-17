import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SessionEditor } from '../workoutSessions/SessionEditor'
import { resolveActiveWorkoutForRoutine } from '../workoutSessions/resolveActiveWorkout'
import { RoutineEditor } from './RoutineEditor'

/**
 * Owns which mode a saved routine is being viewed in.
 *
 * `/routine/:id` edits the routine template. `/routine/:id?workout=1` runs the
 * routine's in-progress workout, but only when one actually exists: the flag
 * asks for workout mode, and a live session belonging to *this* routine has to
 * back it. Neither alone is enough, so a stale or copied link can never show
 * another routine's workout.
 *
 * The two editors stay separate components with separate state, so routine
 * edits cannot leak into a session or the reverse. This container only decides
 * which one to render — /workout/:sessionId remains a working second entry
 * point into the same editor.
 */
export function RoutineWorkoutContainer({ routine }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const workoutRequested = searchParams.get('workout') === '1'
  const routineId = routine.id

  // Resolution is a synchronous localStorage read (see resolveActiveWorkout),
  // so it can seed state directly and workout mode renders on the first pass —
  // no loading state, and no flash of edit mode over a live workout.
  const [activeSession, setActiveSession] = useState(() =>
    workoutRequested ? resolveActiveWorkoutForRoutine(routineId) : null
  )

  // Re-resolve when the flag or the routine changes. Navigating between two
  // routines reuses this component, so without this a workout resolved for the
  // previous routine would linger. No async work is involved, so there is no
  // pending result to cancel.
  useEffect(() => {
    const resolved = workoutRequested
      ? resolveActiveWorkoutForRoutine(routineId)
      : null
    setActiveSession(resolved)

    // The flag asked for a workout that isn't there — a stale link, a finished
    // session, or another routine's workout. Drop quietly to edit mode and tidy
    // the URL in place, rather than reporting an error for a bad bookmark.
    // Only ever reached once resolution has already failed.
    if (workoutRequested && !resolved) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('workout')
          return next
        },
        { replace: true }
      )
    }
  }, [workoutRequested, routineId, setSearchParams])

  const mode = workoutRequested && activeSession ? 'workout' : 'edit'

  if (mode === 'workout') {
    return <SessionEditor initialSession={activeSession} />
  }

  return <RoutineEditor mode="edit" initialRoutine={routine} />
}
