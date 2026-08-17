import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { listCustomExercises } from '../services/customExercises'

/**
 * Load the signed-in user's custom exercise library.
 *
 * A read-only one-shot fetch (no listener) keyed on the authenticated user, so
 * it refetches on sign-in/sign-out and nothing else. Used by the editors to
 * resolve an exercise's instructions/video and to make custom exercises
 * searchable in the add-exercise picker.
 *
 * Failures are non-fatal by design: the list stays empty and built-in exercises
 * continue to resolve, matching the behaviour this replaced in both editors.
 *
 * Returns the array directly — the previous inline implementations tracked no
 * loading or error state, and no caller needs one.
 *
 * Not suitable for screens that mutate the library (the Exercise Library page
 * owns its own copy so it can add/edit/delete entries in place).
 */
export function useCustomExercises() {
  const { user } = useAuth()
  const [customExercises, setCustomExercises] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listCustomExercises(user.uid)
      .then((list) => {
        if (!cancelled) setCustomExercises(list)
      })
      .catch(() => {
        // Non-fatal: built-in exercises still resolve.
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return customExercises
}
