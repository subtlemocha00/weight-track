import { useCallback, useMemo, useRef, useState } from 'react'
import { ConfirmModalContext } from './ConfirmModalContext'
import { ConfirmModal } from '../components/ConfirmModal'

export function ConfirmModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const resolveRef = useRef(null)

  /**
   * Open a confirmation modal and return a Promise that resolves to:
   * - true  if the user clicks the confirm button
   * - false if the user clicks cancel, presses ESC, or clicks the backdrop
   *
   * Usage:
   *   const ok = await confirm({ title: '…', message: '…', confirmLabel: '…', destructive: true })
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
        destructive={modal?.destructive ?? false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmModalContext.Provider>
  )
}
