import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './ConfirmModal.module.css'

/**
 * `altLabel` adds an optional third action for prompts that offer two ways to
 * proceed — "save this" / "throw it away" — plus the usual way out. It sits
 * between Cancel and Confirm, and dismissing the dialog still means cancel, so
 * ESC or the backdrop can never trigger it.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  altLabel,
  destructive = false,
  altDestructive = false,
  onConfirm,
  onAlt,
  onCancel
}) {
  const cancelRef = useRef(null)
  const altRef = useRef(null)
  const confirmRef = useRef(null)

  // Keyboard handling and focus management
  useEffect(() => {
    if (!open) return

    // Default focus to Cancel — safer for destructive actions
    cancelRef.current?.focus()

    // Lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      // Trap Tab within the action buttons, in the order they are rendered.
      if (e.key === 'Tab') {
        e.preventDefault()
        const buttons = [cancelRef.current, altRef.current, confirmRef.current]
          .filter(Boolean)
        const current = buttons.indexOf(document.activeElement)
        const step = e.shiftKey ? -1 : 1
        const next = (current + step + buttons.length) % buttons.length
        buttons[next]?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onCancel])

  if (!open) return null

  const confirmClass = [
    styles.confirm,
    destructive && styles.confirmDestructive
  ]
    .filter(Boolean)
    .join(' ')

  const altClass = [styles.alt, altDestructive && styles.altDestructive]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'cm-title' : undefined}
      aria-describedby={message ? 'cm-message' : undefined}
      onClick={onCancel}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="cm-title" className={styles.title}>{title}</h2>
        )}
        {message && (
          <p id="cm-message" className={styles.message}>{message}</p>
        )}
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancel}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          {altLabel && (
            <button
              ref={altRef}
              type="button"
              className={altClass}
              onClick={onAlt}
            >
              {altLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={confirmClass}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
