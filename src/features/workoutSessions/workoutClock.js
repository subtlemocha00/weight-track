/**
 * How long a workout has been running.
 *
 * Elapsed time is derived, never stored as a running total: the session carries
 * `startedAt`, the paused-time total `pausedMs`, and `pausedAt` while it is
 * currently paused. Every reader computes the same answer from those three, so
 * there is no counter to keep ticking, nothing to drift, and a refresh mid-pause
 * shows exactly what was on screen before it.
 *
 * Pausing is wall-clock aware on purpose: time spent paused is real time the
 * user was not working out, so it is subtracted rather than ignored. Time spent
 * *running* is never subtracted — closing the app without pausing leaves the
 * clock going, which is what "still in progress" means.
 *
 * Sessions written before pausing existed have neither field. They read as
 * running with no paused time, which is what they were.
 */

/** Total time paused across every completed pause, in ms. */
function pausedTotal(session) {
  return session?.pausedMs ?? 0
}

/** Is this session's clock currently stopped? */
export function isPaused(session) {
  return Boolean(session?.pausedAt) && session?.status !== 'completed'
}

/**
 * Elapsed workout time in ms — what the timer displays.
 *
 * The clock stops at the first of: completion, the current pause, or now. Any
 * time already banked in `pausedMs` comes off the total, so a workout paused
 * for an hour and resumed reads an hour shorter than the wall clock.
 */
export function elapsedMs(session, now = Date.now()) {
  if (!session?.startedAt) return 0
  const end = session.completedAt || session.pausedAt || now
  return Math.max(0, end - session.startedAt - pausedTotal(session))
}

/**
 * Stop the clock, returning the session to persist.
 *
 * Only the pause instant is recorded — the total is not touched until the
 * workout resumes, so a pause that is never resumed (the app is closed, the
 * workout is discarded) leaves nothing half-applied.
 *
 * Pausing an already-paused or completed session is a no-op, and returns the
 * same object so nothing downstream treats it as a change.
 */
export function pauseSession(session, now = Date.now()) {
  if (!session || session.status === 'completed') return session
  if (session.pausedAt) return session
  return { ...session, pausedAt: now }
}

/**
 * Restart the clock, banking the pause that just ended.
 *
 * This is what makes the pause invisible to elapsed time: the span is added to
 * `pausedMs` and the pause instant is cleared, leaving a session that reads as
 * running again from wherever the timer had stopped.
 *
 * Safe to call on any session — one that was never paused is returned as-is, so
 * callers can resume unconditionally on the way into a workout.
 */
export function resumeSession(session, now = Date.now()) {
  if (!session?.pausedAt) return session
  const span = Math.max(0, now - session.pausedAt)
  return { ...session, pausedAt: null, pausedMs: pausedTotal(session) + span }
}
