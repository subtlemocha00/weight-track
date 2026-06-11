import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import { getSession } from '../services/workoutSessions'
import { HistoryExerciseItem } from '../features/history/HistoryExerciseItem'
import { RunDetail } from '../features/history/RunDetail'
import { SessionEditForm } from '../features/history/SessionEditForm'
import {
  formatDateTime,
  formatDuration
} from '../features/history/formatSession'
import styles from './HistoryDetailPage.module.css'

export function HistoryDetailPage() {
  const { user } = useAuth()
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!user || !sessionId) return
    let cancelled = false
    setSession(null)
    setError(null)
    setNotFound(false)
    setEditing(false)

    getSession(user.uid, sessionId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
        } else {
          setSession(data)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load session.')
      })

    return () => {
      cancelled = true
    }
  }, [user, sessionId])

  if (error) {
    return (
      <div className={styles.state}>
        <div className={styles.error}>{error}</div>
        <p>
          <Link to="/history">← Back to history</Link>
        </p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.state}>
        <p>Workout session not found.</p>
        <p>
          <Link to="/history">← Back to history</Link>
        </p>
      </div>
    )
  }

  if (!session) {
    return <div className={styles.state}>Loading…</div>
  }

  const isRun = session.type === 'run'
  const inProgress = session.status !== 'completed'
  const sessionTitle = isRun ? 'Run' : (session.routineName || 'Workout')
  const duration = isRun ? null : formatDuration(session.startedAt, session.completedAt)

  if (editing) {
    return (
      <div className={styles.detail}>
        <SessionEditForm
          session={session}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setSession(updated)
            setEditing(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className={styles.detail}>
      <AppHeader backTo="/history">
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </AppHeader>

      <div className={styles.header}>
        <h1 className={styles.routineName}>
          {sessionTitle}
          {isRun && <span className={styles.runBadge}>RUN</span>}
        </h1>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>Date</dt>
            <dd>{formatDateTime(session.completedAt || session.startedAt)}</dd>
          </div>
          {!isRun && (
            <>
              <div className={styles.metaRow}>
                <dt>Started</dt>
                <dd>{formatDateTime(session.startedAt)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Completed</dt>
                <dd>
                  {session.completedAt ? formatDateTime(session.completedAt) : '—'}
                </dd>
              </div>
            </>
          )}
          {duration && (
            <div className={styles.metaRow}>
              <dt>Duration</dt>
              <dd>{duration}</dd>
            </div>
          )}
        </dl>
      </div>

      {inProgress && !isRun && (
        <div className={styles.banner}>
          This workout is still in progress.
        </div>
      )}

      {isRun ? (
        <RunDetail session={session} />
      ) : session.exercises?.length > 0 ? (
        <div className={styles.exercises}>
          {session.exercises.map((exercise, index) => (
            <HistoryExerciseItem
              key={(exercise.exerciseId || 'ex') + '-' + index}
              exercise={exercise}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>This workout has no exercises.</div>
      )}
    </div>
  )
}
