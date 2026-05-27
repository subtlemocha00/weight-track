import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import styles from './InstallBanner.module.css'

const DISMISS_KEY = 'wt-install-banner-dismissed'

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function InstallBanner() {
  const { canInstall, showIOSGuide, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(() => wasDismissed())

  // Persist dismissal so the banner stays hidden across reloads/navigation.
  // It can still be installed later from Settings → App.
  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
  }

  if (dismissed || (!canInstall && !showIOSGuide)) return null

  return (
    <div className={styles.banner} role="complementary" aria-label="Install WeightTrack">
      {canInstall ? (
        <>
          <span className={styles.label}>Install WeightTrack for quick access</span>
          <div className={styles.actions}>
            <button type="button" className={styles.installBtn} onClick={triggerInstall}>
              Install
            </button>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
            >
              ✕
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={styles.label}>
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install
          </span>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => setDismissed(true)}
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </>
      )}
    </div>
  )
}
