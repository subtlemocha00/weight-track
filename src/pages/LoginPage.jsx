import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { user, isLoading, signInWithGoogle } = useAuth()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [signingIn, setSigningIn] = useState(false)

  if (isLoading) return null
  if (user) {
    const from = location.state?.from || '/home'
    return <Navigate to={from} replace />
  }

  const handleSignIn = async () => {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.center}>
        <div className={styles.eyebrow}>── Track Your Progress ──</div>
        <h1 className={styles.logo}>WeightTrack</h1>
        <p className={styles.tagline}>
          Fast, focused workout tracking.<br />No fluff. Just reps.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="button"
          className={styles.button}
          onClick={handleSignIn}
          disabled={signingIn}
        >
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className={styles.version}>v0.1 · Alpha Build</div>
      </div>
    </section>
  )
}
