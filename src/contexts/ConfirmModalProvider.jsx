import { useCallback, useMemo, useRef, useState } from 'react'
import { CONFIRM_ALT, ConfirmModalContext } from './ConfirmModalContext'
import { ConfirmModal } from '../components/ConfirmModal'

export function ConfirmModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const resolveRef = useRef(null)

  /**
   * Open a confirmation modal and return a Promise that resolves to:
   * - true        if the user clicks the confirm button
   * - false       if the user clicks cancel, presses ESC, or clicks the backdrop
   * - CONFIRM_ALT if the user clicks the optional third action
   *
   * Usage:
   *   const ok = await confirm({ title: '…', message: '…', confirmLabel: '…', destructive: true })
   *
   * Pass `altLabel` for a prompt with two ways to proceed and one way out — the
   * third button resolves to CONFIRM_ALT, while dismissing still resolves false.
   * Callers that do not pass it can only ever receive true or false.
   */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setModal(options)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setModal(null)
  }, [])

  const handleAlt = useCallback(() => {
    resolveRef.current?.(CONFIRM_ALT)
    resolveRef.current = null
    setModal(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setModal(null)
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmModalContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={modal !== null}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel ?? 'Confirm'}
        cancelLabel={modal?.cancelLabel ?? 'Cancel'}
        altLabel={modal?.altLabel}
        destructive={modal?.destructive ?? false}
        altDestructive={modal?.altDestructive ?? false}
        onConfirm={handleConfirm}
        onAlt={handleAlt}
        onCancel={handleCancel}
      />
    </ConfirmModalContext.Provider>
  )
}
