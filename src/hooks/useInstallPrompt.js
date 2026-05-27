import { useSyncExternalStore } from 'react'

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

/**
 * Shared, module-level install-prompt store.
 *
 * `beforeinstallprompt` fires once, early, and dispatches the same event to
 * every listener — and its `prompt()` can only be called once. So we capture it
 * a single time at module load and let any number of `useInstallPrompt()`
 * consumers (banner, settings, …) read the same state. Per-component listeners
 * would each hold their own (possibly stale or already-consumed) prompt.
 */
let deferredPrompt = null
let isInstalled = false
let showIOSGuide = false
let prompting = false
let initialized = false

const listeners = new Set()

let snapshot = { canInstall: false, showIOSGuide: false, isInstalled: false }

function buildSnapshot() {
  return {
    canInstall: !isInstalled && !!deferredPrompt,
    showIOSGuide: !isInstalled && showIOSGuide,
    isInstalled
  }
}

function emit() {
  const next = buildSnapshot()
  if (
    next.canInstall === snapshot.canInstall &&
    next.showIOSGuide === snapshot.showIOSGuide &&
    next.isInstalled === snapshot.isInstalled
  ) {
    return
  }
  // New reference only when something actually changed, so useSyncExternalStore
  // doesn't loop on an unstable snapshot.
  snapshot = next
  listeners.forEach((listener) => listener())
}

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  isInstalled = isStandalone()
  if (isInstalled) {
    snapshot = buildSnapshot()
    return
  }

  if (isIOSSafari()) {
    showIOSGuide = true
    snapshot = buildSnapshot()
    return
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    isInstalled = true
    deferredPrompt = null
    emit()
  })

  snapshot = buildSnapshot()
}

init()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export async function triggerInstall() {
  if (!deferredPrompt || prompting) return
  prompting = true
  try {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      isInstalled = true
    }
  } catch {
    // The prompt may already have been used; nothing actionable to do.
  } finally {
    // A prompt can only be consumed once, so drop it regardless of outcome.
    deferredPrompt = null
    prompting = false
    emit()
  }
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    canInstall: state.canInstall,
    showIOSGuide: state.showIOSGuide,
    isInstalled: state.isInstalled,
    triggerInstall
  }
}
