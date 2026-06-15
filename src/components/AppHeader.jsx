import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AppHeader.module.css'

/**
 * Standardized top-of-page header.
 *
 * Renders a back button (left) plus optional right-aligned actions, with an
 * optional page title beneath. Replaces the ad-hoc back buttons that were
 * duplicated across pages.
 *
 * Props:
 * - title:    optional page title shown below the back row
 * - showBack: whether to render the back button (default true). The Home page
 *             is the only top-level screen, so it omits the header entirely.
 * - backTo:   destination for the default back navigation (default '/home')
 * - onBack:   optional override invoked instead of the default navigation.
 *             Used by editors that need an unsaved-changes guard. When provided
 *             it is fully responsible for navigating.
 * - children: optional right-aligned actions (e.g. Edit, sort toggle)
 */
export function AppHeader({
  title,
  showBack = true,
  backTo = '/home',
  onBack,
  children
}) {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      navigate(backTo)
    }
  }, [onBack, navigate, backTo])

  return (
    <header className={styles.header}>
      {(showBack || children) && (
        <div className={styles.topRow}>
          {showBack ? (
            <button type="button" className={styles.back} onClick={handleBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          {children && <div className={styles.actions}>{children}</div>}
        </div>
      )}
      {title && <h1 className={styles.title}>{title}</h1>}
    </header>
  )
}
