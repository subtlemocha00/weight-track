import { useEffect, useRef, useState } from 'react'
import styles from './RestTimer.module.css'

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.trunc(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Local-only rest countdown.
 *
 * Self-contained — owns its own setInterval, calls `onDone` exactly once when
 * the countdown reaches zero or the user dismisses it. Re-mounting with a new
 * `key` is how the parent restarts it.
 */
export function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)

  // Keep onDone fresh without retriggering the interval effect.
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (seconds <= 0) {
      if (!doneRef.current) {
        doneRef.current = true
        onDoneRef.current?.()
      }
      return
    }
    const intervalId = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(intervalId)
          if (!doneRef.current) {
            doneRef.current = true
            // Defer the parent callback so we don't update parent state mid-render.
            queueMicrotask(() => onDoneRef.current?.())
          }
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalId)
  }, [seconds])

  const handleDismiss = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current?.()
  }

  return (
    <div className={styles.timer} role="status" aria-live="polite">
      <span className={styles.label}>Rest</span>
      <span className={styles.value}>{formatMMSS(remaining)}</span>
      <button
        type="button"
        className={styles.skip}
        onClick={handleDismiss}
        aria-label="Skip rest"
      >
        Skip
      </button>
    </div>
  )
}
