import { describe, expect, it } from 'vitest'
import { elapsedMs, isPaused, pauseSession, resumeSession } from './workoutClock'

const MINUTE = 60_000

function session(overrides = {}) {
  return {
    id: 'session-1',
    routineId: 'routine-1',
    startedAt: 1_000_000,
    completedAt: null,
    status: 'in_progress',
    pausedAt: null,
    pausedMs: 0,
    ...overrides
  }
}

describe('elapsedMs', () => {
  it('counts wall-clock time while running', () => {
    expect(elapsedMs(session(), 1_000_000 + 10 * MINUTE)).toBe(10 * MINUTE)
  })

  it('stops at the pause instant, however long ago that was', () => {
    const paused = session({ pausedAt: 1_000_000 + 10 * MINUTE })
    expect(elapsedMs(paused, 1_000_000 + 10 * MINUTE)).toBe(10 * MINUTE)
    expect(elapsedMs(paused, 1_000_000 + 90 * MINUTE)).toBe(10 * MINUTE)
  })

  it('subtracts time already spent paused', () => {
    const resumed = session({ pausedMs: 30 * MINUTE })
    expect(elapsedMs(resumed, 1_000_000 + 45 * MINUTE)).toBe(15 * MINUTE)
  })

  it('stops at completion', () => {
    const done = session({
      status: 'completed',
      completedAt: 1_000_000 + 40 * MINUTE
    })
    expect(elapsedMs(done, 1_000_000 + 999 * MINUTE)).toBe(40 * MINUTE)
  })

  it('reads a session saved before pausing existed as simply running', () => {
    const legacy = { startedAt: 1_000_000, completedAt: null, status: 'in_progress' }
    expect(elapsedMs(legacy, 1_000_000 + 5 * MINUTE)).toBe(5 * MINUTE)
    expect(isPaused(legacy)).toBe(false)
  })

  it('never goes negative on a clock that moved backwards', () => {
    expect(elapsedMs(session(), 900_000)).toBe(0)
  })
})

describe('pauseSession', () => {
  it('records when the clock stopped without banking anything yet', () => {
    const paused = pauseSession(session(), 1_000_000 + 10 * MINUTE)
    expect(paused.pausedAt).toBe(1_000_000 + 10 * MINUTE)
    expect(paused.pausedMs).toBe(0)
    expect(isPaused(paused)).toBe(true)
  })

  it('leaves an already-paused session untouched', () => {
    const paused = session({ pausedAt: 1_000_000 + MINUTE })
    expect(pauseSession(paused, 1_000_000 + 5 * MINUTE)).toBe(paused)
  })

  it('leaves a completed session untouched', () => {
    const done = session({ status: 'completed', completedAt: 1_500_000 })
    expect(pauseSession(done, 2_000_000)).toBe(done)
  })
})

describe('resumeSession', () => {
  it('banks the pause so elapsed time picks up where it stopped', () => {
    const paused = pauseSession(session(), 1_000_000 + 10 * MINUTE)
    const resumed = resumeSession(paused, 1_000_000 + 70 * MINUTE)

    expect(resumed.pausedAt).toBe(null)
    expect(resumed.pausedMs).toBe(60 * MINUTE)
    expect(elapsedMs(resumed, 1_000_000 + 70 * MINUTE)).toBe(10 * MINUTE)
    expect(elapsedMs(resumed, 1_000_000 + 75 * MINUTE)).toBe(15 * MINUTE)
  })

  it('accumulates across repeated pauses', () => {
    let s = resumeSession(pauseSession(session(), 1_000_000), 1_000_000 + 5 * MINUTE)
    s = resumeSession(
      pauseSession(s, 1_000_000 + 20 * MINUTE),
      1_000_000 + 35 * MINUTE
    )

    expect(s.pausedMs).toBe(20 * MINUTE)
    expect(elapsedMs(s, 1_000_000 + 35 * MINUTE)).toBe(15 * MINUTE)
  })

  it('returns a session that was never paused unchanged', () => {
    const running = session()
    expect(resumeSession(running, 2_000_000)).toBe(running)
  })
})
