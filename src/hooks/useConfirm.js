import { useContext } from 'react'
import { ConfirmModalContext } from '../contexts/ConfirmModalContext'

export function useConfirm() {
  const ctx = useContext(ConfirmModalContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmModalProvider')
  return ctx
}
