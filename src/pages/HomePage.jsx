import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listRoutines } from '../services/routines'
import {
  listCompletedSessions,
  markSessionAbandoned,
  startWorkout
} from '../services/workoutSessions'
import { readActiveWorkout, clearActiveWorkout } from '../utils/activeWorkout'
import { QuickRunForm } from '../features/runs/QuickRunForm'
import styles from './HomePage.module.css'

const ACCENT_CLASSES = ['accentGreen', 'accentBlue', 'accentPurple', 'accentOrange']

function formatExerciseCount(n) {
  if (n === 0) return 'No exercises'
  if (n === 1) return '1 exercise'
  return `${n} exercises`
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return ''
  }
}

function formatStartedAt(timestamp) {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [routines, setRoutines] = useState(null)
  const [completionCounts, setCompletionCounts] = useState({})
  const [error, setError] = useState(null)
  const [startingId, setStartingId] = useState(null)
  const [recoverySession, setRecoverySession] = useState(() => readActiveWorkout())
  const [showRunForm, setShowRunForm] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRoutines(null)
    setError(null)
    setCompletionCounts({})

    listRoutines(user.uid)
      .then((data) => {
        if (!cancelled) setRoutines(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load routines.')
      })

    // Completion counts are derived from workout history — the single source of
    // truth. One query for all completed sessions, tallied by routineId, so
    // there is no per-routine query (no N+1). Runs carry no routineId and are
    // naturally excluded. Failures here are non-fatal: cards fall back to 0.
    listCompletedSessions(user.uid)
      .then((sessions) => {
        if (cancelled) return
        const counts = {}
        for (const session of sessions) {
          if (session.routineId) {
            counts[session.routineId] = (counts[session.routineId] || 0) + 1
          }
        }
        setCompletionCounts(counts)
      })
      .catch(() => {
        // Non-fatal: leave counts empty so cards render "Completed: 0 times".
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const handleResume = useCallback(() => {
    if (recoverySession) {
      navigate(`/workout/${recoverySession.id}`)
    }
  }, [recoverySession, navigate])

  const handleDiscard = useCallback(() => {
    if (!recoverySession) return
    const sessionId = recoverySession.id
    clearActiveWorkout()
    setRecoverySession(null)
    // Fire-and-forget: mark the orphaned Firestore doc as abandoned
    if (user && sessionId) {
      markSessionAbandoned(user.uid, sessionId).catch(() => {})
    }
  }, [recoverySession, user])

  const handleStart = useCallback(
    async (routine) => {
      if (!user || startingId) return
      setError(null)
      setStartingId(routine.id)
      try {
        const session = await startWorkout(user.uid, routine)
        navigate(`/workout/${session.id}`)
      } catch (err) {
        setError(err?.message || 'Failed to start workout.')
        setStartingId(null)
      }
    },
    [user, startingId, navigate]
  )

  return (
    <section className={styles.page}>
      {recoverySession && (
        <div className={styles.recoveryBanner}>
          <div className={styles.recoveryInfo}>
            <span className={styles.recoveryLabel}>Unfinished workout</span>
            <span className={styles.recoveryName}>
              {recoverySession.routineName || 'Workout'}
              {recoverySession.startedAt
                ? ` · started ${formatStartedAt(recoverySession.startedAt)}`
                : ''}
            </span>
          </div>
          <div className={styles.recoveryActions}>
            <button
              type="button"
              className={styles.recoveryResume}
              onClick={handleResume}
            >
              Resume
            </button>
            <button
              type="button"
              className={styles.recoveryDiscard}
              onClick={handleDiscard}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className={styles.titleRow}>
        <h1 className={styles.title}>Your routines</h1>
        <Link to="/routine/new" className={styles.cta}>
          + New
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {routines === null && !error && (
        <div className={styles.loading}>Loading…</div>
      )}

      {routines !== null && routines.length === 0 && !error && (
        <div className={styles.empty}>
          You don&rsquo;t have any routines yet. Create your first one.
        </div>
      )}

      {routines !== null && routines.length > 0 && (
        <ul className={styles.list}>
          {routines.map((routine, i) => {
            const exerciseCount = routine.exercises?.length ?? 0
            const isStarting = startingId === routine.id
            const accentClass = ACCENT_CLASSES[i % ACCENT_CLASSES.length]
            return (
              <li key={routine.id} className={styles.row}>
                <div className={`${styles.accentBar} ${styles[accentClass]}`} />
                <Link
                  to={`/routine/${routine.id}`}
                  className={styles.rowMain}
                >
                  <div className={styles.rowName}>
                    {routine.name || 'Untitled routine'}
                  </div>
                  <div className={styles.rowMeta}>
                    {formatExerciseCount(exerciseCount)}
                    {routine.updatedAt
                      ? ` · Updated ${formatUpdatedAt(routine.updatedAt)}`
                      : ''}
                  </div>
                  <div className={styles.rowCount}>
                    Completed:{' '}
                    <span className={styles.rowCountNum}>
                      {completionCounts[routine.id] || 0}
                    </span>{' '}
                    times
                  </div>
                </Link>
                <button
                  type="button"
                  className={styles.start}
                  onClick={() => handleStart(routine)}
                  disabled={exerciseCount === 0 || isStarting || !!recoverySession}
                  title={
                    recoverySession
                      ? 'Resume or discard your current workout first'
                      : exerciseCount === 0
                        ? 'Add exercises before starting'
                        : 'Start workout'
                  }
                >
                  {isStarting ? '…' : '▶ Start'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.runSection}>
        <div className={styles.runHeader}>
          <span className={styles.runTitle}>Quick Run</span>
          {!showRunForm && (
            <button
              type="button"
              className={styles.runStart}
              onClick={() => setShowRunForm(true)}
            >
              + Log Run
            </button>
          )}
        </div>
        {showRunForm && (
          <QuickRunForm onCancel={() => setShowRunForm(false)} />
        )}
      </div>

      <Link to="/exercises" className={styles.navLink}>
        <span>Exercise Library</span>
        <span className={`${styles.navArrow} ${styles.navArrowBlue}`}>→</span>
      </Link>

      <Link to="/history" className={styles.navLink}>
        <span>Workout History</span>
        <span className={`${styles.navArrow} ${styles.navArrowPurple}`}>→</span>
      </Link>
    </section>
  )
}
