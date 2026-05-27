import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import {
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  clampRestSeconds
} from '../services/settings'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { settings, isLoading, loadError, updateSettings } = useSettings()
  const { canInstall, showIOSGuide, isInstalled, triggerInstall } = useInstallPrompt()

  const [form, setForm] = useState(settings)
  const [restInput, setRestInput] = useState(String(settings.defaultRestSeconds))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    setForm(settings)
    setRestInput(String(settings.defaultRestSeconds))
  }, [settings])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const next = {
        ...form,
        defaultRestSeconds: clampRestSeconds(restInput)
      }
      await updateSettings(next)
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(err?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {loadError && <div className={styles.error}>{loadError}</div>}
      {isLoading && <div className={styles.loading}>Loading…</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Appearance</span>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Theme</div>
              <div className={styles.settingSub}>Dark or light display</div>
            </div>
            <div className={styles.toggleGroup}>
              {[['dark', 'Dark'], ['light', 'Light'], ['system', 'Auto']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`${styles.toggleOption} ${form.themePreference === val ? styles.toggleActive : ''}`}
                  onClick={() => setForm({ ...form, themePreference: val })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Units</span>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Default unit</div>
              <div className={styles.settingSub}>Weight unit for new exercises</div>
            </div>
            <div className={styles.toggleGroup}>
              {['lb', 'kg'].map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`${styles.toggleOption} ${form.weightUnit === u ? styles.toggleActive : ''}`}
                  onClick={() => setForm({ ...form, weightUnit: u })}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Rest Timer</span>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Countdown timer</div>
              <div className={styles.settingSub}>Show countdown after completing a set</div>
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={form.restTimerEnabled}
                onChange={(e) =>
                  setForm({ ...form, restTimerEnabled: e.target.checked })
                }
              />
            </label>
          </div>

          <div className={styles.divider} />

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>
                Rest duration ({REST_SECONDS_MIN}–{REST_SECONDS_MAX}s)
              </div>
            </div>
            <div className={styles.numberRow}>
              <input
                type="number"
                inputMode="numeric"
                min={REST_SECONDS_MIN}
                max={REST_SECONDS_MAX}
                step="5"
                className={styles.numberInput}
                value={restInput}
                onChange={(e) => setRestInput(e.target.value)}
                disabled={!form.restTimerEnabled}
              />
              <span className={styles.unit}>s</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>App</span>
          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Install WeightTrack</div>
              <div className={styles.settingSub}>
                {isInstalled
                  ? 'Installed on this device'
                  : canInstall
                    ? 'Add to your home screen for quick access'
                    : showIOSGuide
                      ? 'Tap Share → Add to Home Screen to install'
                      : 'Open in Chrome or Edge to install this app'}
              </div>
            </div>
            {isInstalled ? (
              <span className={styles.installedTag}>Installed</span>
            ) : canInstall ? (
              <button
                type="button"
                className={styles.installBtn}
                onClick={triggerInstall}
              >
                Install
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Account</span>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>{user?.email}</span>
            <button
              type="button"
              className={styles.signOutBtn}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {saveError && <div className={styles.error}>{saveError}</div>}

        <div className={styles.submitRow}>
          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {savedAt && !saving && !saveError && (
            <span className={styles.savedTag}>Saved</span>
          )}
        </div>
      </form>
    </section>
  )
}
