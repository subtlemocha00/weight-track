import { memo } from 'react'
import styles from './RunDetail.module.css'

function formatRunDuration(totalSeconds) {
  if (!totalSeconds) return '—'
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function computePace(duration, distance, unit) {
  if (!distance || !duration || distance <= 0) return null
  const secPerUnit = duration / distance
  const m = Math.floor(secPerUnit / 60)
  const s = Math.round(secPerUnit % 60)
  return `${m}:${String(s).padStart(2, '0')} / ${unit}`
}

function RunDetailImpl({ session }) {
  const rd = session.runData ?? {}
  const pace = computePace(rd.duration, rd.distance, rd.unit)

  return (
    <div className={styles.runCard}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {rd.distance != null ? rd.distance : '—'}
          </span>
          <span className={styles.statLabel}>{rd.unit ?? ''}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatRunDuration(rd.duration)}</span>
          <span className={styles.statLabel}>duration</span>
        </div>
        {pace && (
          <>
            <div className={styles.divider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{pace}</span>
              <span className={styles.statLabel}>avg pace</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>Type</span>
          <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>
            {rd.environment ?? '—'}
          </span>
        </div>
        {rd.notes && (
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>Notes</span>
            <span className={styles.metaVal}>{rd.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const RunDetail = memo(RunDetailImpl)
