import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { OfflineBanner } from '../components/OfflineBanner'
import { InstallBanner } from '../components/InstallBanner'
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
      <OfflineBanner />
      <InstallBanner />
      {user && (
        <header className={styles.header}>
          <Link to="/home" className={styles.brand}>
            WeightTrack
          </Link>
          <div className={styles.headerActions}>
            <Link to="/settings" className={styles.settingsLink} aria-label="Settings">
              ⚙
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
        </header>
      )}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
