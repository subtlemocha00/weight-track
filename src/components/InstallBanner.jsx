import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import styles from './InstallBanner.module.css'

export function InstallBanner() {
  const { canInstall, showIOSGuide, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

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
              onClick={() => setDismissed(true)}
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
