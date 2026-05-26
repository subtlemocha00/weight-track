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
            const exerciseCount = session.exercises?.length ?? 0
            const duration = formatDuration(
              session.startedAt,
              session.completedAt
            )
            return (
              <li key={session.id} className={styles.row}>
                <div className={styles.accentBar} />
                <Link
                  to={`/history/${session.id}`}
                  className={styles.rowMain}
                >
                  <div className={styles.rowName}>
                    {session.routineName || 'Workout'}
                  </div>
                  <div className={styles.rowMeta}>
                    {formatDate(session.completedAt)}
                    {duration ? ` · ${duration}` : ''}
                    {` · ${formatExerciseCount(exerciseCount)}`}
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
