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
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>
        Sign in with Google to create and save workout routines.
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
    </section>
  )
}
