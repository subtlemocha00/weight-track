import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './ConfirmModal.module.css'

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel
}) {
  const cancelRef = useRef(null)
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
      // Trap Tab between the two action buttons
      if (e.key === 'Tab') {
        e.preventDefault()
        if (document.activeElement === cancelRef.current) {
          confirmRef.current?.focus()
        } else {
          cancelRef.current?.focus()
        }
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
