import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SessionEditor } from '../workoutSessions/SessionEditor'
import { discardActiveWorkout } from '../workoutSessions/discardActiveWorkout'
import { resolveActiveWorkoutForRoutine } from '../workoutSessions/resolveActiveWorkout'
import { resolveEditorRoutine } from './resolveEditorRoutine'
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
 * which one to render, and is the only place that mounts a running workout —
 * there is no other route to one.
 *
 * Because it already resolves the routine's live workout, it is also what tells
 * the routine editor whether that workout exists — so Resume is decided from
 * the same read that mounts the session, not from a second one.
 */
export function RoutineWorkoutContainer({ routine }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const workoutRequested = searchParams.get('workout') === '1'
  const routineId = routine.id

  // Resolution is a synchronous localStorage read (see resolveActiveWorkout),
  // so it can seed state directly and workout mode renders on the first pass —
  // no loading state, and no flash of edit mode over a live workout.
  //
  // Resolved whether or not the flag is set: in edit mode the answer is what
  // decides between Start and Resume, and resolving it here keeps the editor
  // from reading wt-active-workout a second time to ask the same question.
  const [activeSession, setActiveSession] = useState(() =>
    resolveActiveWorkoutForRoutine(routineId)
  )

  // The newest saved state of this routine, when the editor has saved since the
  // route loaded. Kept because entering workout mode unmounts the editor: without
  // it, coming back out would re-seed from the older loaded copy — see
  // resolveEditorRoutine.
  const [savedRoutine, setSavedRoutine] = useState(null)

  // Re-resolve when the flag or the routine changes. Navigating between two
  // routines reuses this component, so without this a workout resolved for the
  // previous routine would linger. No async work is involved, so there is no
  // pending result to cancel.
  useEffect(() => {
    const resolved = resolveActiveWorkoutForRoutine(routineId)
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

  // Called by the editor when the route should show the workout — either one it
  // has just created, or the live one it offered to resume. Only the flag is set
  // here; the effect above still does the resolving, so there is one path into
  // workout mode whether the workout was just started, resumed, opened from a
  // link, or recovered after a refresh. Resume therefore creates nothing: it
  // sets a query parameter and the existing session is resolved as usual.
  //
  // Replace, not push, so resuming adds no history entry — Back from the workout
  // still leads out of the routine rather than back into it.
  const enterWorkoutMode = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('workout', '1')
        return next
      },
      { replace: true }
    )
  }, [setSearchParams])

  // Called by the editor when the user throws this routine's workout away. The
  // discard itself is the shared one — identical to the home screen's banner —
  // and clearing the resolved session here is what turns Resume back into Start
  // without a reload. Only reachable in edit mode, where the workout flag is
  // not set, so there is no stale ?workout=1 left behind to clean up.
  const discardWorkout = useCallback(() => {
    if (!activeSession) return
    discardActiveWorkout(user?.uid, activeSession.id)
    setActiveSession(null)
  }, [activeSession, user])

  const mode = workoutRequested && activeSession ? 'workout' : 'edit'

  if (mode === 'workout') {
    return <SessionEditor initialSession={activeSession} />
  }

  return (
    <RoutineEditor
      mode="edit"
      initialRoutine={resolveEditorRoutine(routine, savedRoutine)}
      ownsActiveWorkout={Boolean(activeSession)}
      activeWorkout={activeSession}
      onEnterWorkout={enterWorkoutMode}
      onDiscardWorkout={discardWorkout}
      onRoutineSaved={setSavedRoutine}
    />
  )
}
