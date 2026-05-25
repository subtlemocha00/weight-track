import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getSession } from '../services/workoutSessions'
import { SessionEditor } from '../features/workoutSessions/SessionEditor'
import styles from './WorkoutSessionPage.module.css'

export function WorkoutSessionPage() {
  const { user } = useAuth()
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !sessionId) return
    let cancelled = false
    setSession(null)
    setError(null)
    setNotFound(false)

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
          <Link to="/home">← Back to home</Link>
        </p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.state}>
        <p>Workout session not found.</p>
        <p>
          <Link to="/home">← Back to home</Link>
        </p>
      </div>
    )
  }

  if (!session) {
    return <div className={styles.state}>Loading…</div>
  }

  return <SessionEditor initialSession={session} />
}
