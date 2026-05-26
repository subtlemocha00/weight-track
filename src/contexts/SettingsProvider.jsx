import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings
} from '../services/settings'
import { SettingsContext } from './SettingsContext'

function applyTheme(themePreference) {
  let resolved = themePreference
  if (resolved === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  const attr = resolved === 'light' ? 'light' : ''
  document.documentElement.setAttribute('data-theme', attr)
  localStorage.setItem('wt-theme', attr || 'dark')
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    applyTheme(settings.themePreference)
  }, [settings.themePreference])

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS)
      setIsLoading(false)
      setLoadError(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    getSettings(user.uid)
      .then((loaded) => {
        if (!cancelled) setSettings(loaded)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Failed to load settings.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const updateSettings = useCallback(
    async (next) => {
      if (!user) throw new Error('Not authenticated.')
      const saved = await saveSettings(user.uid, next)
      setSettings(saved)
      return saved
    },
    [user]
  )

  const value = useMemo(
    () => ({ settings, isLoading, loadError, updateSettings }),
    [settings, isLoading, loadError, updateSettings]
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
