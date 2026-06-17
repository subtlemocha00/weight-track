import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { AppHeader } from '../components/AppHeader'
import { listCompletedSessions } from '../services/workoutSessions'
import {
  TIME_FILTERS,
  activityTotals,
  computeFilterIndependentStats,
  formatHoursMinutes,
  formatWeight
} from '../features/stats/computeStats'
import styles from './StatsPage.module.css'

const EMPTY = '—'

function StatCard({ label, value, accent }) {
  return (
    <div className={`${styles.card} ${accent ? styles[accent] : ''}`}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
    </div>
  )
}

function StreakPair({ label, current, longest, accent }) {
  return (
    <div className={`${styles.card} ${accent ? styles[accent] : ''}`}>
      <span className={styles.cardLabel}>{label}</span>
      <div className={styles.streakValues}>
        <span className={styles.cardValue}>{current}</span>
        <span className={styles.streakBest}>best {longest}</span>
      </div>
    </div>
  )
}

function RankList({ items, emptyText }) {
  if (!items.length) {
    return <div className={styles.empty}>{emptyText}</div>
  }
  return (
    <ol className={styles.rankList}>
      {items.map((item, i) => (
        <li key={item.key} className={styles.rankRow}>
          <span className={styles.rankNum}>{i + 1}</span>
          <span className={styles.rankName}>{item.name}</span>
          <span className={styles.rankCount}>{item.count}</span>
        </li>
      ))}
    </ol>
  )
}

export function StatsPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setSessions(null)
    setError(null)
    listCompletedSessions(user.uid)
      .then((data) => {
        if (!cancelled) setSessions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load stats.')
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // Filter-independent: streaks, exercise progress, favorites. Recomputed only
  // when the session list changes — never when the time filter changes.
  const base = useMemo(
    () => (sessions ? computeFilterIndependentStats(sessions) : null),
    [sessions]
  )

  // Time-filtered activity totals, recomputed when filter, sessions, or the
  // user's weight unit changes.
  const totals = useMemo(() => {
    if (!base) return null
    return activityTotals(base.workouts, base.runs, {
      weightUnit: settings.weightUnit,
      filter
    })
  }, [base, filter, settings.weightUnit])

  const hasData = base && (base.workouts.length > 0 || base.runs.length > 0)

  return (
    <section className={styles.page}>
      <AppHeader title="Stats" />

      {error && <div className={styles.error}>{error}</div>}

      {sessions === null && !error && (
        <div className={styles.loading}>Loading…</div>
      )}

      {sessions !== null && !error && !hasData && (
        <div className={styles.empty}>
          No activity yet. Complete a workout or log a run to see your stats.
        </div>
      )}

      {base && hasData && totals && (
        <>
          {/* ── Consistency ─────────────────────────────────────────── */}
          <h2 className={styles.sectionTitle}>Consistency</h2>
          <div className={styles.grid}>
            <StreakPair
              label="Workout Streak (days)"
              current={base.streaks.workoutDaily.current}
              longest={base.streaks.workoutDaily.longest}
              accent="accentGreen"
            />
            <StreakPair
              label="Weekly Workout Streak"
              current={base.streaks.workoutWeekly.current}
              longest={base.streaks.workoutWeekly.longest}
              accent="accentGreen"
            />
            <StreakPair
              label="Run Streak (days)"
              current={base.streaks.runDaily.current}
              longest={base.streaks.runDaily.longest}
              accent="accentBlue"
            />
            <StreakPair
              label="Weekly Run Streak"
              current={base.streaks.runWeekly.current}
              longest={base.streaks.runWeekly.longest}
              accent="accentBlue"
            />
          </div>

          {/* ── Activity ────────────────────────────────────────────── */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Activity</h2>
          </div>
          <div className={styles.filterRow} role="group" aria-label="Time range">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={filter === f.id ? styles.filterActive : styles.filterBtn}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className={styles.grid}>
            <StatCard label="Workouts" value={totals.workoutsCompleted} accent="accentGreen" />
            <StatCard label="Runs" value={totals.runsCompleted} accent="accentBlue" />
            <StatCard
              label="Workout Time"
              value={totals.workoutSeconds > 0 ? formatHoursMinutes(totals.workoutSeconds) : EMPTY}
              accent="accentGreen"
            />
            <StatCard
              label="Run Time"
              value={totals.runSeconds > 0 ? formatHoursMinutes(totals.runSeconds) : EMPTY}
              accent="accentBlue"
            />
            <StatCard
              label="Total Weight Lifted"
              value={totals.totalWeight > 0 ? formatWeight(totals.totalWeight, totals.weightUnit) : EMPTY}
              accent="accentPurple"
            />
          </div>

          {/* ── Exercise Progress ───────────────────────────────────── */}
          <h2 className={styles.sectionTitle}>Exercise Progress</h2>
          <div className={styles.grid}>
            <StatCard
              label="Exercises Tried"
              value={`${base.progress.tried} / ${base.progress.total} (${base.progress.pct}%)`}
              accent="accentOrange"
            />
          </div>

          {/* ── Favorites ───────────────────────────────────────────── */}
          <h2 className={styles.sectionTitle}>Favorites</h2>
          <div className={styles.favBlock}>
            <h3 className={styles.favTitle}>Most Performed Exercises</h3>
            <RankList items={base.topExercises} emptyText="No exercises logged yet." />
          </div>
          <div className={styles.favBlock}>
            <h3 className={styles.favTitle}>Most Performed Routines</h3>
            <RankList items={base.topRoutines} emptyText="No routine workouts yet." />
          </div>
        </>
      )}
    </section>
  )
}
