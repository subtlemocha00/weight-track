import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listCompletedSessions } from '../services/workoutSessions'
import {
  formatDate,
  formatDuration
} from '../features/history/formatSession'
import styles from './HistoryPage.module.css'

function formatExerciseCount(n) {
  if (n === 0) return 'No exercises'
  if (n === 1) return '1 exercise'
  return `${n} exercises`
}

function formatRunMeta(session) {
  const rd = session.runData
  if (!rd) return ''
  const dist = rd.distance != null ? `${rd.distance} ${rd.unit ?? ''}`.trim() : ''
  const dur = rd.duration > 0 ? formatRunDuration(rd.duration) : ''
  return [dist, dur].filter(Boolean).join(' · ')
}

function formatRunDuration(totalSeconds) {
  if (!totalSeconds) return ''
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('desc')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setSessions(null)
    setError(null)
    listCompletedSessions(user.uid, { sort })
      .then((data) => {
        if (!cancelled) setSessions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load history.')
      })
    return () => {
      cancelled = true
    }
  }, [user, sort])

  return (
    <section className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>History</h1>
        <div className={styles.sortToggle} role="group" aria-label="Sort order">
          <button
            type="button"
            className={sort === 'desc' ? styles.active : ''}
            onClick={() => setSort('desc')}
          >
            Newest
          </button>
          <button
            type="button"
            className={sort === 'asc' ? styles.active : ''}
            onClick={() => setSort('asc')}
          >
            Oldest
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {sessions === null && !error && (
        <div className={styles.loading}>Loading…</div>
      )}

      {sessions !== null && sessions.length === 0 && !error && (
        <div className={styles.empty}>
          No completed workouts yet. Finish a workout to see it here.
        </div>
      )}

      {sessions !== null && sessions.length > 0 && (
        <ul className={styles.list}>
          {sessions.map((session) => {
            const isRun = session.type === 'run'
            const rowName = isRun ? 'Run' : (session.routineName || 'Workout')
            const rowMeta = isRun
              ? formatRunMeta(session)
              : (() => {
                  const exerciseCount = session.exercises?.length ?? 0
                  const duration = formatDuration(session.startedAt, session.completedAt)
                  return [
                    formatDate(session.completedAt),
                    duration,
                    formatExerciseCount(exerciseCount)
                  ].filter(Boolean).join(' · ')
                })()
            return (
              <li key={session.id} className={styles.row}>
                <div className={`${styles.accentBar} ${isRun ? styles.accentRun : ''}`} />
                <Link
                  to={`/history/${session.id}`}
                  className={styles.rowMain}
                >
                  <div className={styles.rowName}>
                    {rowName}
                    {isRun && <span className={styles.runBadge}>RUN</span>}
                  </div>
                  <div className={styles.rowMeta}>
                    {isRun && formatDate(session.completedAt)}
                    {isRun && rowMeta ? ` · ${rowMeta}` : rowMeta}
                  </div>
                </Link>
                <span className={styles.rowArrow}>→</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
