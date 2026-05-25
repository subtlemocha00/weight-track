import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link to={user ? '/home' : '/'} className={styles.brand}>
          WeightTrack
        </Link>
        {user && (
          <div className={styles.headerActions}>
            <Link to="/settings" className={styles.headerLink} aria-label="Settings">
              Settings
            </Link>
            <button
              type="button"
              className={styles.signOut}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
