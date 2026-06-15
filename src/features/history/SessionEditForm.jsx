import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { useConfirm } from '../../hooks/useConfirm'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { updateSession } from '../../services/workoutSessions'
import { supersetColor, supersetLabel } from '../../utils/supersets'
import styles from './SessionEditForm.module.css'

/* ---------- value helpers ---------- */

/** ms timestamp -> "YYYY-MM-DDTHH:mm" string for <input type="datetime-local">. */
function toLocalInput(ms) {
  if (!ms && ms !== 0) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(ms - tzOffset).toISOString().slice(0, 16)
}

/** "YYYY-MM-DDTHH:mm" (local) -> ms timestamp, or null if blank/invalid. */
function fromLocalInput(str) {
  if (!str) return null
  const ms = new Date(str).getTime()
  return Number.isFinite(ms) ? ms : null
}

function toIntOrZero(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

function toFloatOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

/* ---------- initial draft from session ---------- */

function deriveInit(session, fallbackDistanceUnit) {
  const isRun = session.type === 'run'
  const rd = session.runData ?? {}
  const duration = Number(rd.duration) || 0

  return {
    isRun,
    startedAt: toLocalInput(session.startedAt),
    completedAt: toLocalInput(session.completedAt),
    runAt: toLocalInput(session.completedAt || session.startedAt),
    distance: rd.distance != null ? String(rd.distance) : '',
    minutes: String(Math.floor(duration / 60)),
    seconds: String(duration % 60),
    runUnit: rd.unit ?? fallbackDistanceUnit,
    environment: rd.environment ?? '',
    runNotes: rd.notes ?? '',
    exercises: (session.exercises ?? []).map((ex) => ({
      ...ex,
      notes: ex.notes ?? '',
      sets: (ex.sets ?? []).map((s) => ({
        ...s,
        reps: s.reps != null ? String(s.reps) : '',
        weight: s.weight != null ? String(s.weight) : '',
        unit: s.unit ?? 'lb'
      }))
    }))
  }
}

/* ---------- build the Firestore patch from live state ---------- */

function buildRunPatch(session, state) {
  const at = fromLocalInput(state.runAt)
  return {
    startedAt: at,
    completedAt: at,
    runData: {
      ...session.runData,
      distance: toFloatOrNull(state.distance),
      duration: toIntOrZero(state.minutes) * 60 + toIntOrZero(state.seconds),
      unit: state.runUnit,
      environment: state.environment,
      notes: state.runNotes.trim() || null
    }
  }
}

function buildWorkoutPatch(state) {
  return {
    startedAt: fromLocalInput(state.startedAt),
    completedAt: fromLocalInput(state.completedAt),
    exercises: state.exercises.map((ex) => ({
      ...ex,
      notes: ex.notes.trim(),
      sets: ex.sets.map((s) => ({
        ...s,
        reps: toIntOrZero(s.reps),
        weight: toFloatOrNull(s.weight),
        unit: s.unit
      }))
    }))
  }
}

function buildPatch(session, state) {
  return state.isRun ? buildRunPatch(session, state) : buildWorkoutPatch(state)
}

/* ---------- validation ---------- */

function validate(session, patch) {
  if (session.type === 'run') {
    if (patch.completedAt == null) return 'Enter a valid date and time.'
    if (!(patch.runData.distance > 0)) return 'Distance must be greater than 0.'
    if (!(patch.runData.duration > 0)) return 'Duration must be greater than 0.'
    return null
  }

  if (patch.startedAt == null) return 'Start date/time is invalid.'
  if (patch.completedAt == null) return 'Completed date/time is invalid.'
  if (patch.completedAt < patch.startedAt) {
    return 'Completed time cannot be before the start time.'
  }
  // reps/weight are coerced to >= 0 / null on input, so no per-set failures here.
  return null
}

/* ---------- component ---------- */

export function SessionEditForm({ session, onCancel, onSaved }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { confirm } = useConfirm()

  const fallbackDistanceUnit = settings.distanceUnit ?? 'km'
  const init = useMemo(
    () => deriveInit(session, fallbackDistanceUnit),
    [session, fallbackDistanceUnit]
  )

  // Session-level (workout)
  const [startedAt, setStartedAt] = useState(init.startedAt)
  const [completedAt, setCompletedAt] = useState(init.completedAt)

  // Run-level
  const [runAt, setRunAt] = useState(init.runAt)
  const [distance, setDistance] = useState(init.distance)
  const [minutes, setMinutes] = useState(init.minutes)
  const [seconds, setSeconds] = useState(init.seconds)
  const [runUnit, setRunUnit] = useState(init.runUnit)
  const [environment, setEnvironment] = useState(init.environment)
  const [runNotes, setRunNotes] = useState(init.runNotes)

  // Workout exercises
  const [exercises, setExercises] = useState(init.exercises)

  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const state = {
    isRun: init.isRun,
    startedAt,
    completedAt,
    runAt,
    distance,
    minutes,
    seconds,
    runUnit,
    environment,
    runNotes,
    exercises
  }

  // Dirty detection: compare normalized patches built the same way for both
  // baseline (initial state) and current state, so unedited fields never
  // register as changes.
  const initialJson = useMemo(
    () => JSON.stringify(buildPatch(session, { ...init })),
    [session, init]
  )
  const currentPatch = buildPatch(session, state)
  const dirty = JSON.stringify(currentPatch) !== initialJson

  useBeforeUnload(dirty && !saving)

  const updateSet = (exIndex, setIndex, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIndex ? s : { ...s, [field]: value }
              )
            }
      )
    )
  }

  const updateExerciseNotes = (exIndex, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i !== exIndex ? ex : { ...ex, notes: value }))
    )
  }

  const handleCancel = async () => {
    if (saving) return
    if (dirty) {
      const discard = await confirm({
        title: 'Discard Changes?',
        message: 'Your edits to this session have not been saved.',
        confirmLabel: 'Discard',
        cancelLabel: 'Cancel',
        destructive: true
      })
      if (!discard) return
    }
    onCancel()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    setError(null)

    const patch = buildPatch(session, state)
    const validationError = validate(session, patch)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      await updateSession(user.uid, session.id, patch)
      onSaved({ ...session, ...patch })
    } catch (err) {
      setError(err?.message || 'Failed to save changes.')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSave} noValidate>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Edit {init.isRun ? 'Run' : session.routineName || 'Workout'}
        </h1>
      </div>

      {init.isRun ? (
        <RunFields
          runAt={runAt}
          setRunAt={setRunAt}
          distance={distance}
          setDistance={setDistance}
          minutes={minutes}
          setMinutes={setMinutes}
          seconds={seconds}
          setSeconds={setSeconds}
          runUnit={runUnit}
          setRunUnit={setRunUnit}
          environment={environment}
          setEnvironment={setEnvironment}
          runNotes={runNotes}
          setRunNotes={setRunNotes}
          disabled={saving}
        />
      ) : (
        <WorkoutFields
          startedAt={startedAt}
          setStartedAt={setStartedAt}
          completedAt={completedAt}
          setCompletedAt={setCompletedAt}
          exercises={exercises}
          updateSet={updateSet}
          updateExerciseNotes={updateExerciseNotes}
          disabled={saving}
        />
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className={styles.saveBtn} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ---------- run sub-form ---------- */

function RunFields({
  runAt,
  setRunAt,
  distance,
  setDistance,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  runUnit,
  setRunUnit,
  environment,
  setEnvironment,
  runNotes,
  setRunNotes,
  disabled
}) {
  return (
    <div className={styles.card}>
      <label className={styles.field}>
        <span className={styles.label}>Date &amp; Time</span>
        <input
          type="datetime-local"
          className={styles.input}
          value={runAt}
          onChange={(e) => setRunAt(e.target.value)}
          disabled={disabled}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Distance</span>
        <div className={styles.distanceRow}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.0"
            className={styles.input}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            disabled={disabled}
          />
          <div className={styles.unitToggle}>
            <button
              type="button"
              className={runUnit === 'km' ? styles.unitActive : styles.unitBtn}
              onClick={() => setRunUnit('km')}
              disabled={disabled}
            >
              km
            </button>
            <button
              type="button"
              className={runUnit === 'mi' ? styles.unitActive : styles.unitBtn}
              onClick={() => setRunUnit('mi')}
              disabled={disabled}
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
            type="number"
            inputMode="numeric"
            min="0"
            max="999"
            placeholder="00"
            className={styles.inputSmall}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-label="Minutes"
            disabled={disabled}
          />
          <span className={styles.durationSep}>:</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="59"
            placeholder="00"
            className={styles.inputSmall}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            aria-label="Seconds"
            disabled={disabled}
          />
          <span className={styles.durationHint}>mm:ss</span>
        </div>
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Type</span>
        <div className={styles.envToggle}>
          <button
            type="button"
            className={environment === 'treadmill' ? styles.envActive : styles.envBtn}
            onClick={() => setEnvironment('treadmill')}
            disabled={disabled}
          >
            Treadmill
          </button>
          <button
            type="button"
            className={environment === 'outdoor' ? styles.envActive : styles.envBtn}
            onClick={() => setEnvironment('outdoor')}
            disabled={disabled}
          >
            Outdoor
          </button>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="Route, conditions, how it felt…"
          value={runNotes}
          onChange={(e) => setRunNotes(e.target.value)}
          maxLength={400}
          disabled={disabled}
        />
      </label>
    </div>
  )
}

/* ---------- workout sub-form ---------- */

function WorkoutFields({
  startedAt,
  setStartedAt,
  completedAt,
  setCompletedAt,
  exercises,
  updateSet,
  updateExerciseNotes,
  disabled
}) {
  return (
    <>
      <div className={styles.card}>
        <label className={styles.field}>
          <span className={styles.label}>Started</span>
          <input
            type="datetime-local"
            className={styles.input}
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Completed</span>
          <input
            type="datetime-local"
            className={styles.input}
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>

      {exercises.length === 0 ? (
        <div className={styles.empty}>This workout has no exercises.</div>
      ) : (
        exercises.map((exercise, exIndex) => (
          <div className={styles.exercise} key={(exercise.exerciseId || 'ex') + '-' + exIndex}>
            <div className={styles.exerciseHeader}>
              <span className={styles.order}>{exIndex + 1}.</span>
              <span className={styles.exerciseName}>{exercise.name}</span>
              {supersetColor(exercise.supersetId) ? (
                <span
                  className={styles.superset}
                  style={{ '--ss-color': supersetColor(exercise.supersetId) }}
                >
                  {supersetLabel(exercise.supersetId)}
                </span>
              ) : exercise.supersetGroup ? (
                <span className={styles.superset}>SS {exercise.supersetGroup}</span>
              ) : null}
            </div>

            {exercise.sets.length > 0 && (
              <>
                <div className={styles.setHeader}>
                  <span>#</span>
                  <span>Reps</span>
                  <span>Weight</span>
                  <span>Unit</span>
                </div>
                <div className={styles.sets}>
                  {exercise.sets.map((set, setIndex) => (
                    <div className={styles.setRow} key={setIndex}>
                      <span className={styles.setIndex}>{setIndex + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        className={styles.setInput}
                        value={set.reps}
                        aria-label={`Set ${setIndex + 1} reps`}
                        disabled={disabled}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, 'reps', e.target.value)
                        }
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        placeholder="—"
                        className={styles.setInput}
                        value={set.weight}
                        aria-label={`Set ${setIndex + 1} weight`}
                        disabled={disabled}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, 'weight', e.target.value)
                        }
                      />
                      <select
                        className={styles.unitSelect}
                        value={set.unit}
                        aria-label={`Set ${setIndex + 1} unit`}
                        disabled={disabled}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, 'unit', e.target.value)
                        }
                      >
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}

            <textarea
              className={styles.notes}
              rows={2}
              placeholder="Exercise notes…"
              value={exercise.notes}
              onChange={(e) => updateExerciseNotes(exIndex, e.target.value)}
              maxLength={400}
              disabled={disabled}
            />
          </div>
        ))
      )}
    </>
  )
}
