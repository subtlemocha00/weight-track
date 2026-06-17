import { getAllExercises, getExerciseById } from '../../services/exercises'

// ---------------------------------------------------------------------------
// Stats are fully DERIVED from existing data (workout + run sessions). Nothing
// here is persisted — every value is recomputed from the in-memory session list
// that the page already loads. All functions are pure so they can be memoized
// once per page load and unit-tested in isolation.
//
// Data shapes (see services/workoutSessions, features/runs/createRunSession):
//   workout session: { type?: undefined, status, startedAt, completedAt,
//                       routineId, routineName, exercises: [{ exerciseId, name,
//                       sets: [{ reps, weight, unit, completed }] }] }
//   run session:     { type: 'run', status, startedAt, completedAt,
//                       runData: { distance, duration(seconds), unit } }
// ---------------------------------------------------------------------------

const DAY_MS = 86400000
const LB_PER_KG = 2.2046226218

export const TIME_FILTERS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'last_7', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30', label: 'Last 30 Days' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all', label: 'All Time' }
]

// A completed session is one we count toward stats. listCompletedSessions already
// filters to these, but guarding here keeps the module correct for any caller.
function isCompleted(s) {
  return s && s.status === 'completed' && s.completedAt
}

function isRun(s) {
  return s.type === 'run'
}

/** Split a mixed session list into completed workouts and completed runs. */
export function splitSessions(sessions = []) {
  const workouts = []
  const runs = []
  for (const s of sessions) {
    if (!isCompleted(s)) continue
    if (isRun(s)) runs.push(s)
    else workouts.push(s)
  }
  return { workouts, runs }
}

// ── Day / week keys ────────────────────────────────────────────────────────
// An integer day index derived from the LOCAL calendar date, so two timestamps
// on the same local day share a key and consecutive local days differ by 1 —
// stable across timezones and DST (uses Date.UTC purely as integer arithmetic
// on the local Y/M/D, never as an actual UTC instant).
function dayNumber(ms) {
  const d = new Date(ms)
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
}

// The day number of the Sunday that starts the local week containing `ms`.
// Consecutive weeks differ by exactly 7, so it doubles as a stable week key.
function weekStartNumber(ms) {
  const d = new Date(ms)
  const dn = dayNumber(ms)
  return dn - d.getDay() // getDay(): 0 = Sunday
}

// ── Streaks ────────────────────────────────────────────────────────────────

/**
 * Longest run and current run of consecutive keys, where "consecutive" means a
 * difference of exactly `step`. `keys` is the set of qualifying period keys
 * (day numbers, or week-start numbers). `anchors` are the period(s) the current
 * streak is allowed to end on (today/this-week, or yesterday/last-week to avoid
 * penalising an in-progress period).
 */
function streakFromKeys(keySet, step, anchors) {
  const sorted = [...keySet].sort((a, b) => a - b)

  let longest = 0
  let run = 0
  let prev = null
  for (const k of sorted) {
    run = prev !== null && k - prev === step ? run + 1 : 1
    if (run > longest) longest = run
    prev = k
  }

  // Current streak: find the most recent allowed anchor present, then walk back.
  let anchor = null
  for (const a of anchors) {
    if (keySet.has(a)) {
      anchor = a
      break
    }
  }
  let current = 0
  if (anchor !== null) {
    let cursor = anchor
    while (keySet.has(cursor)) {
      current += 1
      cursor -= step
    }
  }

  return { current, longest }
}

/** Daily streak: consecutive days with ≥1 completed session. */
export function dailyStreak(sessions, now = Date.now()) {
  const days = new Set(sessions.map((s) => dayNumber(s.completedAt)))
  const today = dayNumber(now)
  return streakFromKeys(days, 1, [today, today - 1])
}

/**
 * Weekly streak: consecutive weeks (Sunday–Saturday) that each contain at least
 * `minPerWeek` completed sessions.
 */
export function weeklyStreak(sessions, now = Date.now(), minPerWeek = 2) {
  const counts = new Map()
  for (const s of sessions) {
    const w = weekStartNumber(s.completedAt)
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  const qualifying = new Set()
  for (const [w, c] of counts) if (c >= minPerWeek) qualifying.add(w)

  const thisWeek = weekStartNumber(now)
  return streakFromKeys(qualifying, 7, [thisWeek, thisWeek - 7])
}

// ── Time-window filtering ──────────────────────────────────────────────────

/** Inclusive lower bound (ms) for a time filter, or 0 for All Time. */
export function rangeStart(filter, now = Date.now()) {
  const d = new Date(now)
  switch (filter) {
    case 'this_week': {
      const x = new Date(now)
      x.setHours(0, 0, 0, 0)
      x.setDate(x.getDate() - x.getDay())
      return x.getTime()
    }
    case 'last_7':
      return now - 7 * DAY_MS
    case 'this_month':
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    case 'last_30':
      return now - 30 * DAY_MS
    case 'this_year':
      return new Date(d.getFullYear(), 0, 1).getTime()
    case 'all':
    default:
      return 0
  }
}

function withinRange(session, start, now) {
  const t = session.completedAt
  return t >= start && t <= now
}

// ── Weight / time helpers ──────────────────────────────────────────────────

function convertWeight(weight, fromUnit, toUnit) {
  const from = fromUnit === 'kg' ? 'kg' : 'lb'
  const to = toUnit === 'kg' ? 'kg' : 'lb'
  if (from === to) return weight
  return from === 'kg' ? weight * LB_PER_KG : weight / LB_PER_KG
}

/** Seconds of elapsed time for a completed workout, or 0 if not measurable. */
function workoutSeconds(s) {
  if (!s.startedAt || !s.completedAt) return 0
  const ms = s.completedAt - s.startedAt
  return ms > 0 ? ms / 1000 : 0
}

// ── Activity totals (time-filtered) ────────────────────────────────────────

/**
 * Counts, durations and total weight lifted for a single time filter.
 * `weightUnit` is the user's chosen unit; per-set weights are converted into it.
 * Bodyweight-only sets (no positive weight) are excluded from total weight.
 */
export function activityTotals(workouts, runs, { weightUnit = 'lb', filter = 'all', now = Date.now() } = {}) {
  const start = rangeStart(filter, now)
  const w = workouts.filter((s) => withinRange(s, start, now))
  const r = runs.filter((s) => withinRange(s, start, now))

  let workoutSecondsTotal = 0
  let totalWeight = 0
  for (const session of w) {
    workoutSecondsTotal += workoutSeconds(session)
    for (const ex of session.exercises || []) {
      for (const set of ex.sets || []) {
        if (!set.completed) continue
        const weight = Number(set.weight)
        const reps = Number(set.reps)
        if (!(weight > 0) || !(reps > 0)) continue // excludes bodyweight-only sets
        totalWeight += convertWeight(weight, set.unit, weightUnit) * reps
      }
    }
  }

  let runSecondsTotal = 0
  for (const session of r) {
    const dur = Number(session.runData?.duration)
    if (dur > 0) runSecondsTotal += dur
  }

  return {
    workoutsCompleted: w.length,
    runsCompleted: r.length,
    workoutSeconds: workoutSecondsTotal,
    runSeconds: runSecondsTotal,
    totalWeight: Math.round(totalWeight),
    weightUnit: weightUnit === 'kg' ? 'kg' : 'lb'
  }
}

// ── Exercise progress ──────────────────────────────────────────────────────

/**
 * Built-in exercises the user has actually performed: an exercise counts as
 * "tried" if it exists in the built-in library AND has ≥1 completed set in any
 * workout session. Custom exercises are excluded from both numerator and
 * denominator (getExerciseById resolves built-ins only).
 */
export function exerciseProgress(workouts) {
  const total = getAllExercises().length
  const tried = new Set()
  for (const session of workouts) {
    for (const ex of session.exercises || []) {
      if (!ex.exerciseId || tried.has(ex.exerciseId)) continue
      const hasCompletedSet = (ex.sets || []).some((s) => s.completed)
      if (hasCompletedSet && getExerciseById(ex.exerciseId)) {
        tried.add(ex.exerciseId)
      }
    }
  }
  const count = tried.size
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return { tried: count, total, pct }
}

// ── Favorites ──────────────────────────────────────────────────────────────

/**
 * Top 10 exercises by number of workout sessions that INCLUDED the exercise
 * (each session counts once regardless of set count). Built-in and custom
 * exercises both qualify; grouped by exerciseId, falling back to name.
 */
export function topExercises(workouts, limit = 10) {
  const counts = new Map() // key -> { name, count }
  for (const session of workouts) {
    const seen = new Set()
    for (const ex of session.exercises || []) {
      const key = ex.exerciseId || `name:${(ex.name || '').trim().toLowerCase()}`
      if (!key || seen.has(key)) continue
      seen.add(key)
      const entry = counts.get(key)
      if (entry) entry.count += 1
      else counts.set(key, { name: ex.name || 'Exercise', count: 1 })
    }
  }
  return rankTop(counts, limit)
}

/**
 * Top 10 routines by number of completed workout sessions run from them.
 * Runs (which carry no routineId) are naturally excluded.
 */
export function topRoutines(workouts, limit = 10) {
  const counts = new Map()
  for (const session of workouts) {
    if (!session.routineId) continue
    const entry = counts.get(session.routineId)
    if (entry) entry.count += 1
    else counts.set(session.routineId, { name: session.routineName || 'Untitled routine', count: 1 })
  }
  return rankTop(counts, limit)
}

function rankTop(counts, limit) {
  return [...counts.entries()]
    .map(([key, { name, count }]) => ({ key, name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

// ── Formatters ─────────────────────────────────────────────────────────────

/** Format a duration in seconds as "14h 23m" (or "23m" under an hour, "0m" empty). */
export function formatHoursMinutes(totalSeconds) {
  const totalMinutes = Math.floor((totalSeconds || 0) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** Thousands-separated weight with its unit, e.g. "124,500 lb". */
export function formatWeight(value, unit) {
  return `${Math.round(value || 0).toLocaleString()} ${unit}`
}

/**
 * Convenience aggregate used by the page: everything that is independent of the
 * selected time filter, computed once. Time-filtered totals are computed
 * separately via activityTotals so changing the filter doesn't recompute these.
 */
export function computeFilterIndependentStats(sessions, now = Date.now()) {
  const { workouts, runs } = splitSessions(sessions)
  return {
    workouts,
    runs,
    streaks: {
      workoutDaily: dailyStreak(workouts, now),
      workoutWeekly: weeklyStreak(workouts, now),
      runDaily: dailyStreak(runs, now),
      runWeekly: weeklyStreak(runs, now)
    },
    progress: exerciseProgress(workouts),
    topExercises: topExercises(workouts),
    topRoutines: topRoutines(workouts)
  }
}
