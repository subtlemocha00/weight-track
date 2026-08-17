import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RoutineEditor } from './RoutineEditor'

/**
 * Owns which mode a saved routine is being viewed in.
 *
 * The consolidation gives `/routine/:id` two modes: editing the routine
 * template, and running a workout from it. This container is where that choice
 * will live, so the two editors stay separate components with separate state —
 * routine edits can never leak into a session, or the reverse.
 *
 * Phase C wires up the structure only. `activeSession` has no producer yet, so
 * `mode` is always 'edit' and the `?workout=1` flag has no effect: it is read
 * here purely so the URL contract exists in one place. Phase D adds the
 * resolution step (localStorage recovery copy, then Firestore) that can set
 * `activeSession` and make the workout branch reachable.
 *
 * The page above still owns loading/error/not-found — every page in this app
 * fetches its own data — so this stays a thin orchestration layer over an
 * already-loaded routine.
 */
export function RoutineWorkoutContainer({ routine }) {
  // Deliberately without a setter: nothing may populate a session in this phase.
  const [activeSession] = useState(null)
  const [searchParams] = useSearchParams()

  // Both are required: the URL asks for workout mode, and a real in-progress
  // session has to have been resolved to back it. Until Phase D supplies the
  // second half, this cannot evaluate to 'workout'.
  const workoutRequested = searchParams.get('workout') === '1'
  const mode = workoutRequested && activeSession ? 'workout' : 'edit'

  if (mode === 'workout') {
    // Unreachable in this phase. Phase D renders SessionEditor here; failing
    // closed to edit mode would silently discard a live workout, so the branch
    // is left explicit rather than folded into the return below.
    return null
  }

  return <RoutineEditor mode="edit" initialRoutine={routine} />
}
