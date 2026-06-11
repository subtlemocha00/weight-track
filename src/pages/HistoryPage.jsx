import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import { useConfirm } from '../hooks/useConfirm'
import { deleteSession, listCompletedSessions } from '../services/workoutSessions'
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
  const { confirm } = useConfirm()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('desc')
  const [deletingId, setDeletingId] = useState(null)

  async function handleDelete(e, session) {
    e.preventDefault()
    e.stopPropagation()
    if (deletingId) return

    const ok = await confirm({
      title: 'Delete Workout?',
      message: 'This permanently removes this workout from your history.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    })
    if (!ok) return

    setDeletingId(session.id)
    try {
      await deleteSession(user.uid, session.id)
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (err) {
      setError(err?.message || 'Failed to delete workout. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

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
      <AppHeader title="History">
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
      </AppHeader>

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
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, session)}
                  disabled={deletingId === session.id}
                  aria-label="Delete workout"
                >
                  {deletingId === session.id ? '…' : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
