import { useEffect } from 'react'

/**
 * Attach a beforeunload handler while `active` is true.
 * This triggers the browser's "Leave page?" dialog on tab close or refresh.
 */
export function useBeforeUnload(active) {
  useEffect(() => {
    if (!active) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
