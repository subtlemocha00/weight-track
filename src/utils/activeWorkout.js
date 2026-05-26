const STORAGE_KEY = 'wt-active-workout'

/**
 * Read the in-progress workout from localStorage.
 * Returns null if nothing is saved, the data is invalid, or the session
 * is already completed.
 */
export function readActiveWorkout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.id || session.status === 'completed') return null
    return session
  } catch {
    return null
  }
}

/**
 * Persist the current session state to localStorage.
 * Automatically removes the entry if the session is completed.
 */
export function writeActiveWorkout(session) {
  try {
    if (!session || session.status === 'completed') {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // localStorage quota exceeded or unavailable — fail silently
  }
}

/**
 * Remove the active workout entry from localStorage.
 */
export function clearActiveWorkout() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
