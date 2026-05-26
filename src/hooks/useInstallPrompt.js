import { useEffect, useState } from 'react'

function isIOSSafari() {
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream
  // iPadOS 13+ reports as MacIntel but has touch support
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return (isIOS || isIPadOS) && /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  )
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => isStandalone())
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    if (isIOSSafari()) {
      setShowIOSGuide(true)
      return
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  return {
    canInstall: !isInstalled && !!deferredPrompt,
    showIOSGuide: !isInstalled && showIOSGuide,
    isInstalled,
    triggerInstall,
  }
}
