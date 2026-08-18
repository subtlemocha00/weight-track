import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { useConfirm } from '../../hooks/useConfirm'
import { useCustomExercises } from '../../hooks/useCustomExercises'
import { deleteRoutine, duplicateRoutine, saveRoutine } from '../../services/routines'
import { resolveExerciseById } from '../../services/exercises'
import {
  hasActiveWorkout,
  startRoutineWorkout
} from '../workoutSessions/startRoutineWorkout'
import { readRoutineDraft, writeRoutineDraft, clearRoutineDraft } from '../../utils/routineDraft'
import { AppHeader } from '../../components/AppHeader'
import { downloadRoutineExport } from './exportRoutine'
import { AddExercisePanel } from './AddExercisePanel'
import { RoutineExerciseItem } from './RoutineExerciseItem'
import { routineReducer } from './routineReducer'
import { resolveWorkoutControl } from './resolveWorkoutControl'
import { getSupersetCount } from '../../utils/supersets'
import styles from './RoutineEditor.module.css'

/**
 * @param onEnterWorkout called when the route should show this routine's
 *   workout — either one Start has just created and made live in the recovery
 *   copy, or the live one Resume offered to go back into. The owner decides how
 *   to get there; this editor never navigates into workout mode itself. Omitted
 *   (e.g. by the new-routine page) means no workout action is offered at all.
 * @param ownsActiveWorkout whether the live workout belongs to this routine,
 *   resolved by the owner from the recovery copy it would mount. Turns the
 *   workout action from Start into Resume.
 * @param onRoutineSaved called with the routine as persisted, every time a save
 *   succeeds. The owner keeps it because entering workout mode unmounts this
 *   editor, and the copy the route loaded may by then be the older one.
 */
export function RoutineEditor({
  initialRoutine,
  mode,
  onEnterWorkout,
  ownsActiveWorkout = false,
  onRoutineSaved
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [routine, dispatch] = useReducer(routineReducer, initialRoutine)
  // Loaded once so an exercise's instructions (which live on the exercise
  // database, not on the routine template) can be resolved for both built-in
  // and custom exercises, and so the add-exercise picker can search the user's
  // custom library. Non-fatal if it fails — items just omit the panel.
  const customExercises = useCustomExercises()
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' })
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  // Same rule the home screen applies: while any workout is unfinished, Start is
  // blocked everywhere until it is resumed or discarded. Read once on mount, as
  // the home screen does, and re-checked when Start is pressed.
  const [workoutInProgress, setWorkoutInProgress] = useState(hasActiveWorkout)
  // Track whether this is the initial mount dispatch (LOAD after save)
  const suppressDirty = useRef(false)
  // The routine as last committed to state. A save captures the routine it sent
  // in its closure; when the write resolves it needs to know whether the editor
  // has been edited since.
  const latestRoutine = useRef(routine)

  const { confirm } = useConfirm()
  const isNew = mode === 'new'
  const canSave = routine.name.trim().length > 0 && saveState.status !== 'saving'
  const supersetCount = getSupersetCount(routine.exercises)
  // A workout action is offered only for a routine that exists in Firestore and
  // only when the owner can act on it (the new-routine page passes no handler).
  // Which action it is depends on whether this routine already owns a live one.
  const workoutControl = resolveWorkoutControl({
    workoutActionsAvailable: !isNew && typeof onEnterWorkout === 'function',
    ownsActiveWorkout
  })
  const noExercises = routine.exercises.length === 0

  useEffect(() => {
    latestRoutine.current = routine
  }, [routine])

  // Warn on browser close / refresh when there are unsaved changes
  useBeforeUnload(isDirty)

  // Rehydrate a stashed routine draft when returning from the Exercise Library's
  // "Swap Exercise" round-trip. The draft carries any unsaved edits plus the
  // applied swap (or just the unsaved edits if the user backed out), so nothing
  // entered before the swap is lost. Mirrors the active-workout swap, which
  // round-trips its state through localStorage the same way.
  useEffect(() => {
    if (location.state?.fromSwap) {
      const draft = readRoutineDraft()
      // For a saved routine, match on id so a stale draft can't load into the
      // wrong routine. A brand-new routine has no persisted identity yet, so the
      // mode match alone is enough (only one can be in progress at a time).
      if (
        draft &&
        draft.mode === mode &&
        (mode === 'new' || draft.routineId === initialRoutine.id)
      ) {
        dispatch({ type: 'LOAD', routine: draft.routine })
        setIsDirty(true)
      }
    }
    // Always clear on mount: a consumed draft is spent, and a stale one left by an
    // abandoned swap must never rehydrate into an unrelated edit session later.
    clearRoutineDraft()
  }, [location.state, mode, initialRoutine.id])

  const dirtyDispatch = useCallback(
    (action) => {
      dispatch(action)
      // LOAD is dispatched after a successful save — don't mark dirty
      if (action.type !== 'LOAD' && !suppressDirty.current) {
        setIsDirty(true)
      }
    },
    []
  )

  // Persist the routine as currently edited. Returns the saved routine, or null
  // when the write failed (the error is already surfaced in the status line).
  // Shared by the Save button and by Start, which must not begin a workout from
  // a routine state that isn't in Firestore.
  const saveCurrentRoutine = useCallback(async () => {
    setSaveState({ status: 'saving', message: 'Saving…' })
    try {
      const saved = await saveRoutine(user.uid, {
        ...routine,
        name: routine.name.trim()
      })
      // Adopt the persisted copy only if the editor has not moved on. Only the
      // Save button is disabled while the write is in flight — every input stays
      // live — so anything typed meanwhile is newer than what was sent, and
      // loading the server's copy over it would discard those edits and mark the
      // editor clean. Keeping the newer state dirty is the honest outcome: the
      // save itself still happened, and `saved` is what Firestore now holds.
      if (latestRoutine.current === routine) {
        suppressDirty.current = true
        dispatch({ type: 'LOAD', routine: saved })
        suppressDirty.current = false
        setIsDirty(false)
      }
      setSaveState({ status: 'saved', message: 'Saved' })
      // Tell the owner what is now persisted. It outlives this editor, which is
      // unmounted whenever the route switches to the workout.
      onRoutineSaved?.(saved)
      return saved
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Save failed.'
      })
      return null
    }
  }, [user, routine, onRoutineSaved])

  const handleSave = useCallback(async () => {
    if (!user) return
    const saved = await saveCurrentRoutine()
    if (saved && isNew) {
      navigate(`/routine/${saved.id}`, { replace: true })
    }
  }, [user, saveCurrentRoutine, isNew, navigate])

  const handleStartWorkout = useCallback(async () => {
    if (!user || workoutControl !== 'start' || starting) return

    // Re-check at press time: the mount-time read can be stale if the workout
    // was finished or discarded in another tab.
    if (hasActiveWorkout()) {
      setWorkoutInProgress(true)
      setSaveState({
        status: 'error',
        message: 'You already have an unfinished workout. Resume or discard it from the home screen first.'
      })
      return
    }

    // A workout snapshots the routine as stored, so unsaved edits have to be
    // written first or the workout silently runs the older version — and the
    // editor is about to unmount, taking those edits with it.
    let source = routine
    if (isDirty) {
      const ok = await confirm({
        title: 'Save changes first?',
        message:
          'This routine has unsaved changes. They need to be saved before the workout can start from them.',
        confirmLabel: 'Save & start',
        cancelLabel: 'Cancel'
      })
      if (!ok) return
      const saved = await saveCurrentRoutine()
      if (!saved) return
      source = saved
    }

    setStarting(true)
    try {
      const session = await startRoutineWorkout(user.uid, source)
      if (!session) {
        // Something became active between the two checks — never clobber it.
        setWorkoutInProgress(true)
        setSaveState({
          status: 'error',
          message: 'You already have an unfinished workout. Resume or discard it from the home screen first.'
        })
        setStarting(false)
        return
      }
      // The session is live in the recovery copy — the owner resolves it from
      // there, so there is a single path into workout mode.
      onEnterWorkout()
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Could not start the workout.'
      })
      setStarting(false)
    }
  }, [
    user,
    workoutControl,
    starting,
    onEnterWorkout,
    routine,
    isDirty,
    confirm,
    saveCurrentRoutine
  ])

  // Resume is navigation, not a start: the session already exists in the
  // recovery copy, so nothing is created, written or saved here — the owner just
  // switches the route into workout mode and the existing session resolves.
  const handleResumeWorkout = useCallback(async () => {
    if (workoutControl !== 'resume') return

    // Entering workout mode unmounts this editor, so unsaved routine edits would
    // go with it. Resume must not save them either — it changes no routine — so
    // it says what will happen and lets the user go back and Save first.
    if (isDirty) {
      const ok = await confirm({
        title: 'Unsaved changes',
        message:
          'Resume your workout without saving these routine changes? They will be lost.',
        confirmLabel: 'Resume',
        cancelLabel: 'Keep editing'
      })
      if (!ok) return
    }

    onEnterWorkout()
  }, [workoutControl, isDirty, confirm, onEnterWorkout])

  const handleDelete = useCallback(async () => {
    if (!user || isNew) return
    const ok = await confirm({
      title: 'Delete routine?',
      message: `"${routine.name || 'This routine'}" will be permanently deleted and cannot be recovered.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteRoutine(user.uid, routine.id)
      navigate('/home', { replace: true })
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Delete failed.'
      })
      setDeleting(false)
    }
  }, [user, isNew, routine.id, routine.name, navigate, confirm])

  const handleDuplicate = useCallback(async () => {
    if (!user || isNew || duplicating) return
    setSaveState({ status: 'idle', message: '' })
    setDuplicating(true)
    try {
      // Copies the routine as currently shown (single write, no re-fetch). On
      // failure nothing is created and the user stays on the original.
      const created = await duplicateRoutine(user.uid, routine)
      navigate(`/routine/${created.id}`)
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Could not duplicate this routine.'
      })
      setDuplicating(false)
    }
  }, [user, isNew, duplicating, routine, navigate])

  const handleExport = useCallback(() => {
    if (isNew) return
    try {
      // Exports the routine as currently shown — a single pass over the
      // in-memory object, no Firestore read.
      downloadRoutineExport(routine)
      setSaveState({ status: 'idle', message: '' })
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err?.message || 'Could not export this routine.'
      })
    }
  }, [isNew, routine])

  const handleBack = useCallback(async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Unsaved changes',
        message: 'Leave without saving your changes?',
        confirmLabel: 'Leave',
        cancelLabel: 'Keep editing'
      })
      if (!ok) return
    }
    navigate('/home')
  }, [isDirty, navigate, confirm])

  const handleAddExercise = useCallback((exercise) => {
    dirtyDispatch({ type: 'ADD_EXERCISE', exercise })
  }, [dirtyDispatch])

  const handleSwapExercise = useCallback(
    (index) => {
      // Stash the full in-progress routine (including any unsaved edits) so the
      // Exercise Library can apply the swap and hand it back on return — the same
      // round-trip the active-workout swap makes through localStorage. `returnTo`
      // for a new routine is /routine/new (its id isn't in Firestore yet); the
      // draft restores the real in-progress identity on the way back.
      const target = routine.exercises[index]
      writeRoutineDraft({ mode, routineId: routine.id, routine })
      navigate('/exercises', {
        state: {
          swap: {
            kind: 'routine',
            exerciseIndex: index,
            fromName: target?.name || 'this exercise',
            returnTo: mode === 'new' ? '/routine/new' : `/routine/${routine.id}`
          }
        }
      })
    },
    [routine, mode, navigate]
  )

  const saveMsgClass = [
    styles.saveMsg,
    saveState.status === 'error' && styles.saveMsgError,
    saveState.status === 'saved' && styles.saveMsgOk
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.editor}>
      <AppHeader onBack={handleBack}>
        {/* One workout action, never two. Once this routine owns the live
          * workout, Resume takes Start's place rather than sitting beside it —
          * Start would be disabled anyway, and offering both suggests a second
          * workout could be created. */}
        {workoutControl === 'resume' && (
          <button
            type="button"
            className={styles.startWorkout}
            onClick={handleResumeWorkout}
            title="Go back into your workout in progress"
          >
            ▶ Resume
          </button>
        )}
        {workoutControl === 'start' && (
          <button
            type="button"
            className={styles.startWorkout}
            onClick={handleStartWorkout}
            disabled={starting || workoutInProgress || noExercises}
            title={
              workoutInProgress
                ? 'Resume or discard your current workout first'
                : noExercises
                  ? 'Add exercises before starting'
                  : 'Start workout'
            }
          >
            {starting ? '…' : '▶ Start'}
          </button>
        )}
        {isNew && (
          <button
            type="button"
            className={styles.save}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saveState.status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        )}
      </AppHeader>

      {saveState.message && (
        <div className={styles.saveStatus}>
          <span className={saveMsgClass}>{saveState.message}</span>
        </div>
      )}

      <label className={styles.nameField}>
        <span className={styles.nameLabel}>Routine name</span>
        <input
          className={styles.nameInput}
          type="text"
          value={routine.name}
          onChange={(e) => dirtyDispatch({ type: 'SET_NAME', name: e.target.value })}
          placeholder="e.g. Push Day"
          maxLength={80}
          autoFocus={isNew}
        />
      </label>

      <AddExercisePanel
        onAdd={handleAddExercise}
        customExercises={customExercises}
      />

      {routine.exercises.length === 0 ? (
        <div className={styles.empty}>
          No exercises yet. Use the panel above to add some.
        </div>
      ) : (
        <div className={styles.exercises}>
          {routine.exercises.map((exercise, index) => {
            const resolved = resolveExerciseById(exercise.exerciseId, customExercises)
            return (
            <RoutineExerciseItem
              key={`${exercise.exerciseId}-${index}`}
              exercise={exercise}
              index={index}
              isFirst={index === 0}
              isLast={index === routine.exercises.length - 1}
              supersetCount={supersetCount}
              instructions={resolved?.instructions ?? []}
              videoUrl={resolved?.videoUrl ?? null}
              onRemove={() => dirtyDispatch({ type: 'REMOVE_EXERCISE', index })}
              onMoveUp={() =>
                dirtyDispatch({ type: 'MOVE_EXERCISE', from: index, to: index - 1 })
              }
              onMoveDown={() =>
                dirtyDispatch({ type: 'MOVE_EXERCISE', from: index, to: index + 1 })
              }
              onAddSet={() => dirtyDispatch({ type: 'ADD_SET', index })}
              onRemoveSet={(setIndex) =>
                dirtyDispatch({
                  type: 'REMOVE_SET',
                  exerciseIndex: index,
                  setIndex
                })
              }
              onUpdateSet={(setIndex, patch) =>
                dirtyDispatch({
                  type: 'UPDATE_SET',
                  exerciseIndex: index,
                  setIndex,
                  patch
                })
              }
              onUpdateNotes={(notes) =>
                dirtyDispatch({ type: 'UPDATE_EXERCISE_NOTES', index, notes })
              }
              onAssignSuperset={(supersetId) =>
                dirtyDispatch({ type: 'ASSIGN_SUPERSET', index, supersetId })
              }
              onSwap={() => handleSwapExercise(index)}
              onUpdateAllUnits={(unit) =>
                exercise.sets.forEach((_, setIndex) =>
                  dirtyDispatch({
                    type: 'UPDATE_SET',
                    exerciseIndex: index,
                    setIndex,
                    patch: { unit }
                  })
                )
              }
            />
            )
          })}
        </div>
      )}

      {/* Routine management lives at the foot of the page: Back and the workout
        * action are what the header is for, and these are what you reach for
        * once you have finished editing. A new routine keeps Save beside Back,
        * since there is nothing below to scroll past. */}
      {!isNew && (
        <div className={styles.secondaryActions}>
          <button
            type="button"
            className={styles.duplicate}
            onClick={handleDuplicate}
            disabled={duplicating || deleting}
          >
            {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
          <button
            type="button"
            className={styles.export}
            onClick={handleExport}
            disabled={duplicating || deleting}
          >
            Export
          </button>
          <button
            type="button"
            className={styles.delete}
            onClick={handleDelete}
            disabled={deleting || duplicating}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saveState.status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
