import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listRoutines } from '../services/routines'
import { startWorkout } from '../services/workoutSessions'
import styles from './HomePage.module.css'

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

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [routines, setRoutines] = useState(null)
  const [error, setError] = useState(null)
  const [startingId, setStartingId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRoutines(null)
    setError(null)
    listRoutines(user.uid)
      .then((data) => {
        if (!cancelled) setRoutines(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load routines.')
      })
    return () => {
      cancelled = true
    }
  }, [user])

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
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Your routines</h1>
        <div className={styles.actions}>
          <Link to="/history" className={styles.secondary}>
            History
          </Link>
          <Link to="/routine/new" className={styles.cta}>
            + New routine
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

      {routines !== null && routines.length > 0 && (
        <ul className={styles.list}>
          {routines.map((routine) => {
            const exerciseCount = routine.exercises?.length ?? 0
            const isStarting = startingId === routine.id
            return (
              <li key={routine.id} className={styles.row}>
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
                </Link>
                <button
                  type="button"
                  className={styles.start}
                  onClick={() => handleStart(routine)}
                  disabled={exerciseCount === 0 || isStarting}
                  title={
                    exerciseCount === 0
                      ? 'Add exercises before starting'
                      : 'Start workout'
                  }
                >
                  {isStarting ? '…' : 'Start ▶'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
