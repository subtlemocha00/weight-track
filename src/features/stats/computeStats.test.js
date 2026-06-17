import { describe, it, expect } from 'vitest'
import {
  splitSessions,
  dailyStreak,
  weeklyStreak,
  activityTotals,
  exerciseProgress,
  topExercises,
  topRoutines,
  rangeStart,
  formatHoursMinutes,
  formatWeight
} from './computeStats'

const DAY = 86400000

// Build a local-midnight timestamp `daysAgo` before a fixed reference "now".
// Reference: 2026-06-17 12:00 local (a Wednesday) — matches the project date.
const NOW = new Date(2026, 5, 17, 12, 0, 0).getTime()
function dayAt(daysAgo, hour = 9) {
  const d = new Date(2026, 5, 17, hour, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}

function workout(daysAgo, { exercises = [], routineId, routineName, durationMin = 60 } = {}) {
  const started = dayAt(daysAgo)
  return {
    type: undefined,
    status: 'completed',
    startedAt: started,
    completedAt: started + durationMin * 60000,
    routineId,
    routineName,
    exercises
  }
}

function run(daysAgo, durationSec = 1800) {
  const t = dayAt(daysAgo)
  return { type: 'run', status: 'completed', startedAt: t, completedAt: t, runData: { duration: durationSec } }
}

function ex(id, name, sets) {
  return { exerciseId: id, name, sets }
}
function set(weight, reps, { completed = true, unit = 'lb' } = {}) {
  return { weight, reps, unit, completed }
}

describe('splitSessions', () => {
  it('separates completed workouts and runs, dropping incomplete', () => {
    const { workouts, runs } = splitSessions([
      workout(0),
      run(0),
      { type: undefined, status: 'in_progress', completedAt: null }
    ])
    expect(workouts).toHaveLength(1)
    expect(runs).toHaveLength(1)
  })
})

describe('dailyStreak', () => {
  it('counts consecutive days ending today', () => {
    const s = [workout(0), workout(1), workout(2)]
    expect(dailyStreak(s, NOW)).toEqual({ current: 3, longest: 3 })
  })

  it('keeps current streak alive when last activity was yesterday', () => {
    const s = [workout(1), workout(2)]
    expect(dailyStreak(s, NOW).current).toBe(2)
  })

  it('breaks current streak after a missed day, but remembers the longest', () => {
    const s = [workout(2), workout(3), workout(4)] // gap at days 0 and 1
    const r = dailyStreak(s, NOW)
    expect(r.current).toBe(0)
    expect(r.longest).toBe(3)
  })

  it('collapses multiple sessions on the same day into one', () => {
    const s = [workout(0), workout(0), workout(1)]
    expect(dailyStreak(s, NOW)).toEqual({ current: 2, longest: 2 })
  })
})

describe('weeklyStreak', () => {
  it('requires >=2 sessions per week and counts consecutive weeks', () => {
    // This week (2 sessions) + last week (2 sessions) => current 2
    const s = [workout(0), workout(1), workout(7), workout(8)]
    const r = weeklyStreak(s, NOW)
    expect(r.current).toBe(2)
    expect(r.longest).toBe(2)
  })

  it('does not count a week with only one session', () => {
    const s = [workout(0), workout(7), workout(8)] // this week has only 1
    const r = weeklyStreak(s, NOW)
    // current anchors on last week (this week incomplete), so current = 1
    expect(r.current).toBe(1)
    expect(r.longest).toBe(1)
  })
})

describe('activityTotals', () => {
  const workouts = [
    workout(0, { exercises: [ex('a', 'Squat', [set(100, 5), set(100, 5, { completed: false })])] }),
    workout(40, { exercises: [ex('a', 'Squat', [set(50, 10)])] })
  ]
  const runs = [run(0, 1800), run(40, 1800)]

  it('counts only sessions within the time window', () => {
    const t = activityTotals(workouts, runs, { filter: 'last_30', now: NOW })
    expect(t.workoutsCompleted).toBe(1)
    expect(t.runsCompleted).toBe(1)
  })

  it('sums total weight from completed sets only, excluding bodyweight', () => {
    const t = activityTotals(workouts, runs, { filter: 'all', now: NOW })
    // day0: 100*5 = 500 (second set not completed) ; day40: 50*10 = 500
    expect(t.totalWeight).toBe(1000)
  })

  it('converts set units into the user weight unit', () => {
    const w = [workout(0, { exercises: [ex('a', 'Squat', [set(100, 1, { unit: 'kg' })])] })]
    const t = activityTotals(w, [], { weightUnit: 'lb', filter: 'all', now: NOW })
    expect(t.totalWeight).toBe(220) // 100kg -> ~220.46 lb, rounded
  })

  it('sums durations as seconds for the window', () => {
    const t = activityTotals(workouts, runs, { filter: 'all', now: NOW })
    expect(t.runSeconds).toBe(3600)
    expect(t.workoutSeconds).toBe(2 * 60 * 60) // two 60-min workouts
  })
})

describe('exerciseProgress', () => {
  it('counts only built-in exercises with a completed set; ignores custom ids', () => {
    const workouts = [
      workout(0, { exercises: [ex('not-a-real-builtin-id', 'Custom', [set(10, 5)])] }),
      workout(1, { exercises: [ex('builtin-x', 'X', [set(0, 0, { completed: false })])] })
    ]
    const r = exerciseProgress(workouts)
    expect(r.tried).toBe(0)
    expect(r.total).toBeGreaterThan(0)
    expect(r.pct).toBe(0)
  })
})

describe('favorites', () => {
  it('topExercises counts sessions that included the exercise, once each', () => {
    const workouts = [
      workout(0, { exercises: [ex('a', 'Squat', [set(1, 1), set(1, 1)]), ex('b', 'Bench', [set(1, 1)])] }),
      workout(1, { exercises: [ex('a', 'Squat', [set(1, 1)])] })
    ]
    const top = topExercises(workouts)
    expect(top[0]).toMatchObject({ name: 'Squat', count: 2 })
    expect(top.find((t) => t.name === 'Bench').count).toBe(1)
  })

  it('topRoutines counts completed workouts per routine', () => {
    const workouts = [
      workout(0, { routineId: 'r1', routineName: 'Push' }),
      workout(1, { routineId: 'r1', routineName: 'Push' }),
      workout(2, { routineId: 'r2', routineName: 'Pull' })
    ]
    const top = topRoutines(workouts)
    expect(top[0]).toMatchObject({ name: 'Push', count: 2 })
  })
})

describe('rangeStart', () => {
  it('all-time starts at 0', () => {
    expect(rangeStart('all', NOW)).toBe(0)
  })
  it('last_7 is exactly 7 days before now', () => {
    expect(rangeStart('last_7', NOW)).toBe(NOW - 7 * DAY)
  })
  it('this_year starts at Jan 1 local', () => {
    expect(rangeStart('this_year', NOW)).toBe(new Date(2026, 0, 1).getTime())
  })
})

describe('formatters', () => {
  it('formats hours and minutes', () => {
    expect(formatHoursMinutes(60 * (14 * 60 + 23))).toBe('14h 23m')
    expect(formatHoursMinutes(60 * 23)).toBe('23m')
    expect(formatHoursMinutes(0)).toBe('0m')
  })
  it('formats weight with thousands separator and unit', () => {
    expect(formatWeight(124500, 'lb')).toBe('124,500 lb')
  })
})
