import { useState } from 'react'
import styles from './AddToRoutineSelect.module.css'

/**
 * In-card dropdown that appends this exercise to the end of an existing routine
 * and saves immediately. `onAdd(routineId)` does the fetch/append/save and
 * returns a promise; this component only owns the transient UI state (the
 * "Adding…" / "Added" / error feedback). The select is controlled to an empty
 * value so it always resets to the placeholder after a selection.
 */
export function AddToRoutineSelect({ routines, onAdd }) {
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const [message, setMessage] = useState('')

  const hasRoutines = Array.isArray(routines) && routines.length > 0

  const handleChange = async (e) => {
    const routineId = e.target.value
    if (!routineId) return
    const routine = routines.find((r) => r.id === routineId)
    const label = routine?.name || 'routine'
    setStatus('saving')
    setMessage(`Adding to ${label}…`)
    try {
      await onAdd(routineId)
      setStatus('done')
      setMessage(`Added to ${label}`)
    } catch (err) {
      setStatus('error')
      setMessage(err?.message || 'Could not add to routine.')
    }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Add to routine</span>
      <select
        className={styles.select}
        value=""
        onChange={handleChange}
        disabled={!hasRoutines || status === 'saving'}
        aria-label="Add this exercise to a routine"
      >
        <option value="">
          {hasRoutines ? 'Select a routine…' : 'No routines yet'}
        </option>
        {hasRoutines &&
          routines.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || 'Untitled routine'}
            </option>
          ))}
      </select>
      {message && (
        <span
          className={`${styles.msg} ${status === 'error' ? styles.msgError : ''}`}
        >
          {message}
        </span>
      )}
    </div>
  )
}
