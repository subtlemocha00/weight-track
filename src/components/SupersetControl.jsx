import { supersetColor, supersetLabel } from '../utils/supersets'
import styles from './SupersetControl.module.css'

/**
 * Visual superset assignment control. Renders one button per existing superset
 * plus exactly one "next" slot, so a superset becomes available only after the
 * previous one exists (A, then B, then C, …).
 *
 * - clicking an unassigned slot assigns the exercise to it
 * - clicking the exercise's current slot removes the assignment
 * - reassigning is just clicking a different slot (handled by the parent reducer)
 *
 * Stateless: the parent owns the data and supplies `supersetCount` (number of
 * supersets currently in use across the list) and the exercise's `supersetId`.
 *
 * @param {number|null} supersetId  this exercise's current superset (1-based) or null
 * @param {number} supersetCount    distinct supersets currently in use
 * @param {(slot: number) => void} onAssign  called with the clicked slot id
 * @param {boolean} [disabled]
 */
export function SupersetControl({ supersetId, supersetCount, onAssign, disabled = false }) {
  // Show every existing slot (1..count) plus one new slot (count + 1).
  const slots = Array.from({ length: supersetCount + 1 }, (_, i) => i + 1)

  return (
    <div className={styles.control}>
      <span className={styles.label}>Superset</span>
      <div className={styles.buttons} role="group" aria-label="Superset assignment">
        {slots.map((slot) => {
          const active = supersetId === slot
          const color = supersetColor(slot)
          return (
            <button
              key={slot}
              type="button"
              className={`${styles.slot} ${active ? styles.active : ''}`}
              style={{ '--ss-color': color }}
              onClick={() => onAssign(slot)}
              disabled={disabled}
              aria-pressed={active}
              title={active ? `Remove from ${supersetLabel(slot)}` : `Assign to ${supersetLabel(slot)}`}
            >
              {supersetLabel(slot)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
