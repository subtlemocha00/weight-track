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
 * Accepts either a full `exercise` (Exercise Library usage) or a bare `videoUrl`
 * string (routine/workout cards, which store only an exerciseId and resolve the
 * library exercise's URL upstream). This keeps a single button implementation
 * shared across every screen.
 *
 * @param {object} props
 * @param {object} [props.exercise] Normalized exercise (carries `videoUrl`).
 * @param {string} [props.videoUrl] Explicit URL, takes precedence over exercise.
 */
export function WatchVideoButton({ exercise, videoUrl }) {
  const url = videoUrl ?? exercise?.videoUrl
  if (!isSafeVideoUrl(url)) return null

  return (
    <button
      type="button"
      className={styles.watch}
      onClick={() => window.open(url.trim(), '_blank', 'noopener,noreferrer')}
    >
      Watch Video
    </button>
  )
}
