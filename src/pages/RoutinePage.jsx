import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import { getRoutine } from '../services/routines'
import { RoutineEditor } from '../features/routines/RoutineEditor'
import styles from './RoutinePage.module.css'

export function RoutinePage() {
  const { user } = useAuth()
  const { id } = useParams()
  const [routine, setRoutine] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    setRoutine(null)
    setError(null)
    setNotFound(false)

    getRoutine(user.uid, id)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
        } else {
          setRoutine(data)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load routine.')
      })

    return () => {
      cancelled = true
    }
  }, [user, id])

  if (error) {
    return (
      <div className={styles.state}>
        <AppHeader backTo="/home" />
        <div className={styles.error}>{error}</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.state}>
        <AppHeader backTo="/home" />
        <p>Routine not found.</p>
      </div>
    )
  }

  if (!routine) {
    return <div className={styles.state}>Loading…</div>
  }

  return <RoutineEditor mode="edit" initialRoutine={routine} />
}
