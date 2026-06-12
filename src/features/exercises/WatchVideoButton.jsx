import { isSafeVideoUrl } from '../../services/exercises'
import styles from './WatchVideoButton.module.css'

/**
 * Renders a "Watch Video" button for an exercise's optional instructional video
 * link, or nothing when the exercise has no usable link. Centralizing the
 * "should this show?" + "open safely" logic here keeps the rule in one place so
 * every exercise display stays consistent.
 *
 * Opens the link in a new tab with noopener/noreferrer. Only absolute http(s)
 * URLs are accepted (see isSafeVideoUrl) — other schemes render nothing.
 *
 * @param {object} props
 * @param {object} props.exercise Normalized exercise (carries `videoUrl`).
 */
export function WatchVideoButton({ exercise }) {
  const videoUrl = exercise?.videoUrl
  if (!isSafeVideoUrl(videoUrl)) return null

  return (
    <button
      type="button"
      className={styles.watch}
      onClick={() => window.open(videoUrl.trim(), '_blank', 'noopener,noreferrer')}
    >
      Watch Video
    </button>
  )
}
