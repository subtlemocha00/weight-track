import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CustomExerciseEditor.module.css'

/**
 * Edit modal for a single custom exercise.
 *
 * Owns its own form state and basic validation (name required); the parent
 * performs the Firestore write via `onSave` and controls `saving`/`error`.
 * Built-in exercises never reach this component — the library only wires
 * `onEdit` for custom cards.
 *
 * Body part / equipment use the existing built-in filter options so an edited
 * exercise stays aligned with the filter dropdowns. Muscles are entered as a
 * comma-separated list, instructions as one step per line — both mirror the
 * built-in exercise shape (string arrays).
 */
export function CustomExerciseEditor({
  exercise,
  options,
  saving = false,
  error = '',
  onSave,
  onCancel
}) {
  const [name, setName] = useState(exercise.name ?? '')
  const [bodyPart, setBodyPart] = useState(exercise.bodyPart ?? '')
  const [equipment, setEquipment] = useState(exercise.equipment ?? '')
  const [targetMuscles, setTargetMuscles] = useState(
    listToText(exercise.targetMuscles)
  )
  const [secondaryMuscles, setSecondaryMuscles] = useState(
    listToText(exercise.secondaryMuscles)
  )
  const [instructions, setInstructions] = useState(
    linesToText(exercise.instructions)
  )

  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onCancel, saving])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSave) return
    // Preserve identity fields (id, source, createdAt, isBodyweight, difficulty)
    // by spreading the original; the save service stamps a fresh updatedAt.
    onSave({
      ...exercise,
      name: trimmedName,
      bodyPart: bodyPart || null,
      equipment: equipment || null,
      targetMuscles: textToList(targetMuscles),
      secondaryMuscles: textToList(secondaryMuscles),
      instructions: textToLines(instructions)
    })
  }

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cee-title"
      onClick={() => !saving && onCancel()}
    >
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="cee-title" className={styles.title}>
          Edit custom exercise
        </h2>

        <label className={styles.field}>
          <span className={styles.label}>Name *</span>
          <input
            ref={nameRef}
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Body part</span>
            <select
              className={styles.select}
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
            >
              <option value="">(none)</option>
              {options.bodyParts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Equipment</span>
            <select
              className={styles.select}
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              <option value="">(none)</option>
              {options.equipment.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Target muscles</span>
          <input
            className={styles.input}
            type="text"
            value={targetMuscles}
            onChange={(e) => setTargetMuscles(e.target.value)}
            placeholder="comma separated, e.g. chest, triceps"
            autoComplete="off"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Secondary muscles</span>
          <input
            className={styles.input}
            type="text"
            value={secondaryMuscles}
            onChange={(e) => setSecondaryMuscles(e.target.value)}
            placeholder="comma separated"
            autoComplete="off"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Instructions</span>
          <textarea
            className={styles.textarea}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="One step per line"
            rows={4}
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className={styles.save} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

// Muscles: array <-> "a, b, c". Stored lowercase/trimmed so they line up with
// the built-in muscle vocabulary used by the filters.
function listToText(list) {
  return Array.isArray(list) ? list.join(', ') : ''
}

function textToList(text) {
  return text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

// Instructions: array <-> one line per step.
function linesToText(list) {
  return Array.isArray(list) ? list.join('\n') : ''
}

function textToLines(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
