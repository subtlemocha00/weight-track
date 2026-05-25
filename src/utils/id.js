/**
 * Generate a short random id. Used for client-generated routine ids so the
 * editor can render and reorder before the first Firestore write.
 */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  )
}
