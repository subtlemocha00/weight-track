import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listRoutines, setRoutineFavorite } from '../services/routines'
import {
  isFavorite,
  orderRoutinesByFavorite
} from '../features/routines/favoriteRoutines'
import { listCompletedSessions } from '../services/workoutSessions'
import { readActiveWorkout } from '../utils/activeWorkout'
import { discardActiveWorkout } from '../features/workoutSessions/discardActiveWorkout'
import { activeWorkoutPath } from '../features/workoutSessions/workoutNavigation'
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
  const [recoverySession, setRecoverySession] = useState(() => readActiveWorkout())
  const [showRunForm, setShowRunForm] = useState(false)
  // Ids whose star write is still in flight. One star can't be pressed again
  // until its own write lands, so two writes for the same routine can never
  // race and settle in the wrong order.
  const [pendingFavorites, setPendingFavorites] = useState(() => new Set())

  // Favourites float to the top of the list as loaded — which is already
  // ordered by last edit — so both groups keep that ordering. Derived at render
  // rather than stored, so a star only has to flip one boolean.
  const orderedRoutines = useMemo(
    () => (routines === null ? null : orderRoutinesByFavorite(routines)),
    [routines]
  )

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

  // Resume opens the workout on the routine route, which resolves this exact
  // recovery copy out of localStorage — the same object the banner is built
  // from — so no session is created and nothing is re-read from Firestore.
  const handleResume = useCallback(() => {
    if (recoverySession) {
      navigate(activeWorkoutPath(recoverySession))
    }
  }, [recoverySession, navigate])

  // Starring is not an edit to the routine: it writes the one field and leaves
  // updatedAt alone, so the routine keeps its place in the last-edit ordering
  // and simply changes which group it is ordered within.
  const handleToggleFavorite = useCallback(
    async (routine) => {
      if (!user || pendingFavorites.has(routine.id)) return
      const next = !isFavorite(routine)

      // Applied locally first so the star and the routine's position respond to
      // the press. Only this field changes, so nothing else held about the
      // routine can go stale behind it.
      const setFavoriteLocally = (value) =>
        setRoutines((prev) =>
          prev
            ? prev.map((item) =>
                item.id === routine.id ? { ...item, favorite: value } : item
              )
            : prev
        )

      setFavoriteLocally(next)
      setPendingFavorites((prev) => new Set(prev).add(routine.id))
      setError(null)

      try {
        await setRoutineFavorite(user.uid, routine.id, next)
      } catch (err) {
        // Put it back. A star left showing a state Firestore never accepted
        // would look saved right up until the next reload.
        setFavoriteLocally(!next)
        setError(err?.message || 'Could not update favourites.')
      } finally {
        setPendingFavorites((prev) => {
          const remaining = new Set(prev)
          remaining.delete(routine.id)
          return remaining
        })
      }
    },
    [user, pendingFavorites]
  )

  const handleDiscard = useCallback(() => {
    if (!recoverySession) return
    discardActiveWorkout(user?.uid, recoverySession.id)
    setRecoverySession(null)
  }, [recoverySession, user])

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
        <div className={styles.titleActions}>
          <Link to="/import" className={styles.ctaSecondary}>
            ⤓ Import
          </Link>
          <Link to="/routine/new" className={styles.cta}>
            + New
          </Link>
        </div>
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

      {orderedRoutines !== null && orderedRoutines.length > 0 && (
        <ul className={styles.list}>
          {orderedRoutines.map((routine, i) => {
            const exerciseCount = routine.exercises?.length ?? 0
            const accentClass = ACCENT_CLASSES[i % ACCENT_CLASSES.length]
            const favorite = isFavorite(routine)
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
                {/* A sibling of the link, never inside it, so pressing the star
                  * cannot also open the routine. Filled vs outlined star, not
                  * colour alone, carries the state visually; aria-pressed and
                  * the label carry it for assistive tech. */}
                <button
                  type="button"
                  className={`${styles.star} ${favorite ? styles.starOn : ''}`}
                  onClick={() => handleToggleFavorite(routine)}
                  disabled={pendingFavorites.has(routine.id)}
                  aria-pressed={favorite}
                  aria-label={
                    favorite ? 'Remove from favourites' : 'Add to favourites'
                  }
                  title={
                    favorite ? 'Remove from favourites' : 'Add to favourites'
                  }
                >
                  <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
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
