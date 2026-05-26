import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { saveSession } from '../../services/workoutSessions'
import { createRunSession } from './createRunSession'
import styles from './QuickRunForm.module.css'

export function QuickRunForm({ onCancel }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const defaultUnit = settings.weightUnit === 'kg' ? 'km' : 'mi'

  const [distance, setDistance] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [unit, setUnit] = useState(defaultUnit)
  const [environment, setEnvironment] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const dist = parseFloat(distance)
    if (!Number.isFinite(dist) || dist <= 0) {
      setError('Distance must be a positive number.')
      return
    }

    const mins = Math.max(0, parseInt(minutes || '0', 10))
    const secs = Math.max(0, parseInt(seconds || '0', 10))
    const totalSeconds = mins * 60 + secs
    if (totalSeconds <= 0) {
      setError('Duration must be greater than 0.')
      return
    }

    if (!environment) {
      setError('Select treadmill or outdoor.')
      return
    }

    setSaving(true)
    try {
      const session = createRunSession({
        distance: dist,
        duration: totalSeconds,
        unit,
        environment,
        notes: notes.trim() || null
      })
      await saveSession(user.uid, session)
      navigate(`/history/${session.id}`)
    } catch (err) {
      setError(err?.message || 'Failed to save run.')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Distance</span>
          <div className={styles.distanceRow}>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              autoComplete="off"
            />
            <div className={styles.unitToggle}>
              <button
                type="button"
                className={unit === 'km' ? styles.unitActive : styles.unitBtn}
                onClick={() => setUnit('km')}
              >
                km
              </button>
              <button
                type="button"
                className={unit === 'mi' ? styles.unitActive : styles.unitBtn}
                onClick={() => setUnit('mi')}
              >
                mi
              </button>
            </div>
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Duration</span>
          <div className={styles.durationRow}>
            <input
              className={styles.inputSmall}
              type="number"
              inputMode="numeric"
              min="0"
              max="999"
              placeholder="00"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label="Minutes"
            />
            <span className={styles.durationSep}>:</span>
            <input
              className={styles.inputSmall}
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              placeholder="00"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              aria-label="Seconds"
            />
            <span className={styles.durationHint}>mm:ss</span>
          </div>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Type</span>
        <div className={styles.envToggle}>
          <button
            type="button"
            className={environment === 'treadmill' ? styles.envActive : styles.envBtn}
            onClick={() => setEnvironment('treadmill')}
          >
            Treadmill
          </button>
          <button
            type="button"
            className={environment === 'outdoor' ? styles.envActive : styles.envBtn}
            onClick={() => setEnvironment('outdoor')}
          >
            Outdoor
          </button>
        </div>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes (optional)</span>
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="Route, conditions, how it felt…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={400}
        />
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving…' : 'Log Run'}
        </button>
      </div>
    </form>
  )
}
