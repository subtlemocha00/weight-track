import { useEffect, useState } from 'react'
import { elapsedMs, isPaused } from './workoutClock'

function format(diffMs) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

/**
 * Displays how long `session` has been running. Self-refreshes once every 30s
 * so the header doesn't go stale mid-workout. Not a stopwatch — no controls.
 *
 * The value is always derived by workoutClock, so a paused workout renders a
 * frozen figure rather than none, and the refresh stops with it: once the clock
 * is stopped — paused or completed — re-rendering could only redraw the same
 * number.
 */
export function ElapsedTime({ session }) {
  const [, setTick] = useState(0)
  const running = Boolean(session) && !session.completedAt && !isPaused(session)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [running])

  if (!session) return null
  return <>{format(elapsedMs(session))}</>
}
