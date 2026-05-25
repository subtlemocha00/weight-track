import { useEffect, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import {
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  clampRestSeconds
} from '../services/settings'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const { settings, isLoading, loadError, updateSettings } = useSettings()

  const [form, setForm] = useState(settings)
  const [restInput, setRestInput] = useState(String(settings.defaultRestSeconds))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  // Resync local form when settings are (re)loaded from Firestore.
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

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {loadError && <div className={styles.error}>{loadError}</div>}
      {isLoading && <div className={styles.loading}>Loading…</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Weight unit</legend>
          <label className={styles.option}>
            <input
              type="radio"
              name="weightUnit"
              value="lb"
              checked={form.weightUnit === 'lb'}
              onChange={() => setForm({ ...form, weightUnit: 'lb' })}
            />
            <span>lb</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="weightUnit"
              value="kg"
              checked={form.weightUnit === 'kg'}
              onChange={() => setForm({ ...form, weightUnit: 'kg' })}
            />
            <span>kg</span>
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Rest timer</legend>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={form.restTimerEnabled}
              onChange={(e) =>
                setForm({ ...form, restTimerEnabled: e.target.checked })
              }
            />
            <span>Show countdown after completing a set</span>
          </label>

          <label className={styles.numberRow}>
            <span className={styles.numberLabel}>
              Default rest ({REST_SECONDS_MIN}–{REST_SECONDS_MAX}s)
            </span>
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
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Theme</legend>
          <label className={styles.option}>
            <input
              type="radio"
              name="themePreference"
              value="system"
              checked={form.themePreference === 'system'}
              onChange={() =>
                setForm({ ...form, themePreference: 'system' })
              }
            />
            <span>System</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="themePreference"
              value="light"
              checked={form.themePreference === 'light'}
              onChange={() => setForm({ ...form, themePreference: 'light' })}
            />
            <span>Light</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="themePreference"
              value="dark"
              checked={form.themePreference === 'dark'}
              onChange={() => setForm({ ...form, themePreference: 'dark' })}
            />
            <span>Dark</span>
          </label>
          <p className={styles.hint}>
            Theme is stored but not yet applied — actual theming arrives in a
            later phase.
          </p>
        </fieldset>

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
