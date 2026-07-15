const STORAGE_KEY = 'wt-routine-draft'

/**
 * Short-lived hand-off used only by the routine editor's "Swap Exercise" flow.
 *
 * The routine editor is not autosaved (it persists on an explicit Save), so when
 * a swap sends the user to the Exercise Library the in-progress routine — with
 * any unsaved edits — is stashed here first. The library applies the swap to it
 * and writes it back, and the editor rehydrates it on return. This mirrors how
 * the active-workout swap round-trips through localStorage (see activeWorkout.js),
 * the only difference being that this draft is transient rather than a continuous
 * crash-recovery copy.
 *
 * Shape: { mode: 'new' | 'edit', routineId: string, routine: object }
 */

export function readRoutineDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (!draft?.routine) return null
    return draft
  } catch {
    return null
  }
}

export function writeRoutineDraft(draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // localStorage quota exceeded or unavailable — fail silently
  }
}

export function clearRoutineDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
