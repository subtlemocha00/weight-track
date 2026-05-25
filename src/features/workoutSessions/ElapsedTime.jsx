import { useEffect, useState } from 'react'

function format(diffMs) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

/**
 * Displays elapsed time since `startedAt`. Self-refreshes once every 30s so
 * the header doesn't go stale mid-workout. Not a stopwatch — no controls.
 */
export function ElapsedTime({ startedAt, completedAt }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (completedAt) return
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [completedAt])

  const endTime = completedAt || Date.now()
  return <>{format(endTime - startedAt)}</>
}
