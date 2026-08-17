# Routine / Active Workout Consolidation — Architecture Audit & Migration Plan

Status: **audit only — no implementation**
Date: 2026-08-17
Baseline commit: `a24db5d` (branch `main`)

Goal being planned for: merge `/workout/:sessionId` into `/routine/:id` so a routine page can
operate in **Routine/Edit mode** or **Active Workout mode** without a route change, while keeping
routine templates and workout sessions strictly separate.

---

## 1. Current architecture

### 1.1 Routes (`src/App.jsx`)

| Route | Page | Loading | Notes |
|---|---|---|---|
| `/routine/new` | `NewRoutinePage` | eager | builds a blank routine client-side (`createBlankRoutine`, id from `newId()`) |
| `/routine/:id` | `RoutinePage` | eager | `getRoutine(uid, id)` → `RoutineEditor mode="edit"` |
| `/workout/:sessionId` | `WorkoutSessionPage` | eager | localStorage-first, then `getSession` → `SessionEditor` |
| `/history`, `/history/:sessionId` | history pages | lazy | read-only + a separate edit form |
| `/exercises` | `ExercisesPage` | lazy | doubles as the **swap target** for both routine and workout |

All routes render inside `AppLayout` (`<Outlet/>`) and are wrapped in `ProtectedRoute`.
There is no route-level guard for an in-progress workout.

### 1.2 `/routine` — `RoutineEditor`

* **State**: `useReducer(routineReducer, initialRoutine)` + local `saveState`, `deleting`,
  `duplicating`, `isDirty`, `customExercises`, and a `suppressDirty` ref.
* **Loads**: `getRoutine` (page level), `listCustomExercises` (for instructions/video resolution).
* **Writes**: nothing until **Save** (`saveRoutine` = full-document `setDoc`, stamps `updatedAt`).
  `Delete` and `Duplicate` write immediately. `Export` is client-side download only.
* **Dirty tracking**: `dirtyDispatch` wrapper flags `isDirty` for every action except `LOAD`;
  `useBeforeUnload(isDirty)` guards refresh/close; the in-app Back button confirms.
* **Exercise management**: add (via `AddExercisePanel`, **built-ins only** — no `customExercises`
  prop passed here), remove, move up/down, swap (round-trip through `/exercises`).
* **Set management**: add set, remove set, edit `reps` / `targetWeight` / `restSeconds`, and a
  per-exercise unit toggle implemented as N `UPDATE_SET` dispatches.
* **Supersets**: `SupersetControl` in the card body → `ASSIGN_SUPERSET` → `assignSuperset()`
  (toggle + renumber to be gap-free).
* **Notes**: live `<textarea>` per exercise.
* **Swap**: stashes the whole in-progress routine in `localStorage['wt-routine-draft']`, navigates
  to `/exercises` with `state.swap = { kind: 'routine', exerciseIndex, fromName, returnTo }`,
  and rehydrates on return via `location.state.fromSwap`.
* **No Start Workout affordance exists on this page.** Starting is Home-only.

### 1.3 `/workout` — `SessionEditor`

* **State**: `useReducer(sessionReducer, initialSession)` + `finishing`, `error`,
  `customExercises`.
* **Initialization** happens on **Home**, not here: `startWorkout(uid, routine)` →
  `createSessionFromRoutine(routine)` → immediate `setDoc` (status `in_progress`) →
  `navigate('/workout/:id')`.
* **Autosave**: `useEffect` writes the entire session to `localStorage['wt-active-workout']` on
  every state change. Firestore is **not** written again until Finish.
* **Load order** (`WorkoutSessionPage`): localStorage wins when `saved.id === sessionId` and it is
  not completed; otherwise Firestore.
* **Duration**: `ElapsedTime` derives from `startedAt` and re-renders every 30 s. Nothing is
  stored; history recomputes `completedAt - startedAt`.
* **Rest timer**: `RestTimer`, local runtime state inside `SessionExerciseItem`, started on set
  completion when a next set exists, duration from `settings.defaultRestSeconds`.
* **Set completion**: `TOGGLE_SET_COMPLETED` sets `completed` + `timestamp`.
* **Sets cannot be added or removed during a workout** — `sessionReducer` has no `ADD_SET` /
  `REMOVE_SET` case (deliberate per the Phase 4 "structurally locked" comment in
  `sessionFactory.js`).
* **Notes are read-only during a workout** (rendered as a `<p>`, no editor).
* **Exercise management**: add (with custom exercises searchable), remove (confirmed), move,
  swap, superset assignment, per-exercise unit.
* **Finish**: `dispatch(FINISH)` → `saveSession` (full `setDoc`) → `clearActiveWorkout()` →
  confirm **"Update routine?"** → on Yes: `getRoutine` + `applySessionToRoutine` + `saveRoutine`
  → `navigate('/home', { replace: true })`.
* **Back**: confirms "Leave workout?" then navigates home; the session stays active in
  localStorage and is offered again by the Home recovery banner.
* **Completed sessions** render the same editor with `readOnly` and an informational banner.

### 1.4 Home page

* Lists routines (`listRoutines`, ordered by `updatedAt desc`).
* Derives per-routine completion counts from `listCompletedSessions` (single query, tallied by
  `routineId`).
* **Recovery banner** when `readActiveWorkout()` returns a session: Resume → `/workout/:id`;
  Discard → `clearActiveWorkout()` + fire-and-forget `markSessionAbandoned`.
* **Start** button per routine card, disabled while any recovery session exists or the routine
  has no exercises.

### 1.5 History

Read-only list + detail, sourced only from `users/{uid}/workoutSessions`. `SessionEditForm`
allows post-hoc correction of an existing session document (`updateSession`, partial write).
Stats (`/stats`) derive everything from the same completed-session list.

---

## 2. Data model (unchanged by this work)

### Routine — `users/{uid}/routines/{routineId}`

```jsonc
{
  "name": "Push Day",
  "createdAt": 1690000000000,
  "updatedAt": 1690000000000,
  "exercises": [
    {
      "exerciseId": "barbell-bench-press",   // library id (built-in or custom)
      "name": "Barbell Bench Press",         // denormalized display name
      "order": 0,
      "notes": "",
      "supersetId": null,                    // null | 1 | 2 … (gap-free)
      "sets": [ { "reps": 8, "targetWeight": null, "unit": "lb", "restSeconds": null } ]
    }
  ]
}
```

The document id is **not** stored in the body (`saveRoutine` strips `id`; it is recovered from
`snap.id`). Routine ids are client-generated (`newId()` → `crypto.randomUUID()`).

### Workout session — `users/{uid}/workoutSessions/{sessionId}`

```jsonc
{
  "routineId": "…",           // links back to the template; absent for runs
  "routineName": "Push Day",  // snapshot, never re-read from the routine
  "startedAt": 1690000000000,
  "completedAt": null,
  "status": "in_progress",    // in_progress | completed | abandoned
  "exercises": [
    {
      "exerciseId": "…", "name": "…", "order": 0, "notes": "", "supersetId": null,
      "sets": [ { "reps": 8, "weight": null, "unit": "lb", "completed": false, "timestamp": null } ]
    }
  ]
}
```

Runs share the collection: `{ type: 'run', status: 'completed', runData: {…} }`.

**Key structural facts:**

* Sets have **no ids** — they are matched **positionally** everywhere
  (`applyToRoutine`, `SessionEditForm`, stats).
* Routine sets use `targetWeight` + `restSeconds`; session sets use `weight` + `completed` +
  `timestamp`. `applyToRoutine` performs the translation.
* Supersets are a numeric `supersetId` on the exercise; labels/colours are derived in the UI.
  Legacy sessions may carry a freeform `supersetGroup` string (history renders it, nothing else).
* Duration is **derived**, never stored.
* `restSeconds` is authored and exported but not consumed at runtime — the rest timer uses only
  `settings.defaultRestSeconds`.

---

## 3. Functionality comparison

| Functionality | `/routine` | `/workout` | Desired combined behaviour |
|---|---|---|---|
| View exercise list | Yes | Yes | Shared list; card component differs by mode |
| Exercise instructions / video | Yes | Yes | Shared, both modes |
| Add exercise | Yes (built-ins only) | Yes (built-ins + custom) | Shared picker with custom library in **both** modes; target = routine draft in edit mode, session in workout mode |
| Remove exercise | Yes (no confirm) | Yes (confirm, "routine not affected") | Keep both behaviours, mode-specific copy |
| Reorder exercises | Yes | Yes | Same, per-mode target |
| Swap exercise | Yes (via `wt-routine-draft`) | Yes (via `wt-active-workout`) | One swap flow; the return target must know which mode/state to patch |
| Add / remove set | Yes | **No** | Edit mode: routine sets. Workout mode: add-set-for-today is a **new capability** (session-only) — must not write to the routine |
| Edit reps | Yes (`reps`) | Yes (`reps`) | Both; different owning object |
| Edit weight | Yes (`targetWeight`, planned) | Yes (`weight`, actual) | Both; keep field names distinct |
| Edit rest seconds per set | Yes (`restSeconds`) | No | Edit mode only |
| Unit toggle (lb/kg) | Yes (N dispatches) | Yes (single action) | Shared control; single action in both |
| Mark set complete | No | Yes | Workout mode only |
| Rest timer | No | Yes (global setting) | Workout mode only |
| Workout elapsed timer | No | Yes | Workout mode only |
| Exercise notes | Editable textarea | Read-only text | Edit mode: routine notes. Workout mode: today's notes (session-only) — currently missing |
| Supersets | Yes | Yes | Shared control; per-mode target |
| Routine name field | Yes | Read-only header text | Editable in edit mode only |
| Save routine | Explicit Save | Never (except opt-in at finish) | Edit mode only |
| Delete routine | Yes | No | Edit mode only |
| Duplicate routine | Yes | No | Edit mode only |
| Export routine | Yes | No | Edit mode only |
| Start workout | **No** | n/a | New primary action in edit mode |
| Finish workout | No | Yes | Workout mode only |
| "Update routine?" prompt | No | Yes (on finish) | Workout mode only; unchanged |
| Unsaved-changes guard | `isDirty` + confirm + `beforeunload` | active-session confirm + `beforeunload` | Both, chosen by mode |
| Crash recovery | Transient draft during swap only | Continuous localStorage autosave | Keep session autosave; keep routine draft semantics |
| Read-only presentation | No | Yes (completed sessions) | Completed sessions should stay on `/history` (see §7.4) |

---

## 4. Data flow (current)

```
Routine doc (users/{uid}/routines/{id})
   │ getRoutine
   ▼
RoutinePage → RoutineEditor (reducer state, dirty-tracked, saved on demand)
   │
   │  Home → handleStart(routine)
   ▼
startWorkout() → createSessionFromRoutine()   // deep snapshot; targetWeight → weight
   │                                          // status: in_progress, startedAt: now
   ├─ setDoc users/{uid}/workoutSessions/{newId}
   └─ navigate /workout/:sessionId
   ▼
SessionEditor (reducer state)
   ├─ every change → localStorage['wt-active-workout']   (the only live copy)
   └─ Firestore NOT updated during the workout
   │
   │  Finish
   ▼
dispatch FINISH → saveSession(full doc, status: completed, completedAt)
   ├─ clearActiveWorkout()
   ├─ confirm "Update routine?"
   │     └─ Yes → getRoutine → applySessionToRoutine → saveRoutine
   └─ navigate /home
   ▼
History (/history, /history/:id), Home completion counts, /stats
   — all derived from workoutSessions; no duplicate storage
```

`applySessionToRoutine` treats the **session list as the desired routine shape**: it maps
session exercises by `exerciseId` onto routine exercises, materializes exercises added during
the workout, drops exercises removed during the workout, applies ordering and superset changes,
copies `reps`/`weight`→`targetWeight`/`unit`, and preserves routine-only fields
(`restSeconds`, `notes`) for pre-existing exercises.

---

## 5. Duplicate logic and its eventual destination

| Area | Today | Eventual disposition |
|---|---|---|
| Exercise card shell (header, order, name, instructions panel, unit toggle, superset control, notes block) | `RoutineExerciseItem` + `SessionExerciseItem` (near-identical markup, two CSS modules) | **Shared presentational shell** with mode-specific set rows and actions. Do this *after* the page merge, not before |
| Set row | `SetRow` (reps/targetWeight/rest/remove) vs `SessionSetRow` (reps/weight/done) | **Stay separate** — different fields and semantics |
| Number parsing (`parseInt10`, `parseFloatNum`) | duplicated verbatim in both set rows | **Shared utility** (`src/utils/number.js`) — trivial, low risk |
| Exercise picker | `AddExercisePanel` already shared | Shared; pass `customExercises` in both modes |
| Superset logic | `utils/supersets.js` already shared | Unchanged |
| `ASSIGN_SUPERSET` / `MOVE_EXERCISE` / `REMOVE_EXERCISE` reducer cases | duplicated in `routineReducer` and `sessionReducer` | **Keep separate reducers** (routine `touch()`es `updatedAt`, session must not). Optionally extract the shared exercise-array helpers |
| Exercise resolution (`resolveExerciseById` + `listCustomExercises`) | duplicated `useEffect` in both editors | **Shared hook** `useCustomExercises()` |
| Swap round-trip | two localStorage keys, two branches in `ExercisesPage` | **One swap contract** once both live on the same route; keep two storage keys (different lifetimes) |
| Unsaved-guard | `useBeforeUnload` already shared | Unchanged |
| Header/actions | `AppHeader` already shared | Unchanged |

---

## 6. Risks and edge cases

### Existing defects the merge must not inherit or worsen

1. **Finish is not crash-safe.** `handleFinish` dispatches `FINISH` *before* `saveSession`
   resolves. The autosave effect then sees `status === 'completed'` and **deletes** the
   localStorage copy. If `saveSession` rejects (offline is the likely case), the only remaining
   copy is in memory, the error message claims "your progress is saved", and the Finish button is
   now disabled because `isCompleted` is true. A refresh at that point loses the workout.
   *Fix before or during the merge; do not port as-is.*
2. **`applySessionToRoutine` keys on `exerciseId`.** A routine containing the same exercise twice
   collides in the lookup `Map`; both session entries resolve to the same routine original.
3. **Positional set matching.** Sets added during a workout (once that capability exists) would be
   silently dropped by `applySessionToRoutine`, which iterates `original.sets`.
4. **`handleFinish` closes over a stale `confirm`** (ESLint `exhaustive-deps` warning, same in
   `RoutineEditor`). Harmless today; worth fixing while touching these files.

### State separation

* Two reducers, two shapes, one page. The main hazard is a single "exercises" array being edited
  by both modes. **Mitigation**: keep `routineReducer` and `sessionReducer` and their state
  objects entirely separate; the page renders one or the other, never a merged view.
* `routineReducer.touch()` stamps `updatedAt` on every action — if routine actions were ever
  dispatched during a workout, the routine's `updatedAt` would drift even without a save.

### Persistence

* The only routine writer is `saveRoutine`, called from Save / Delete / Duplicate / the
  post-workout opt-in / `ExercisesPage.handleAddToRoutine`. As long as workout mode never calls
  `saveRoutine`, an active workout cannot overwrite the routine.
* Risk introduced by the merge: an "unsaved routine edits" state that is still live when the user
  hits **Start Workout**. The session must be built from a defined source (see §7.3).

### Workout history / duplicate sessions

* `saveSession` is `setDoc` with a client-generated id → **idempotent**; a retry cannot create a
  second history row.
* Duplicate *sessions* are prevented only by the Home-page recovery banner, which is
  **localStorage-scoped**. Another device (or cleared storage) can start a second in-progress
  session for the same routine. The merge makes this more visible: a Start button will now sit on
  the routine page itself.
* Orphaned `in_progress` docs are excluded from history/stats by the `status === 'completed'`
  filter, so they are cosmetic, not corrupting.

### Navigation

* Browser Back is **not** intercepted (no `unstable_usePrompt` / blocker). Today it merely leaves
  `/workout`; the session survives in localStorage and Home offers Resume.
* After the merge, Back from workout mode must not silently drop the user into edit mode of the
  same route with a live session running. Mode must be recoverable from state, not from history
  position.
* `navigate('/home', { replace: true })` after finish prevents Back from re-entering a finished
  workout. Preserve that.

### Refresh

* `/workout/:sessionId` re-reads localStorage first, so refresh is currently lossless **on the
  same device**. Firestore holds only the start-time snapshot until Finish.
* After the merge, `/routine/:id` must decide on load whether to enter workout mode. `readActiveWorkout()`
  matching on `routineId` is the natural signal, and `/workout/:sessionId` must keep resolving for
  bookmarks and the recovery banner during migration.

### Abandonment

* Leaving is non-destructive: the session stays in localStorage, Home shows the banner, Discard
  marks the Firestore doc `abandoned`. No timeout or expiry exists — an abandoned session lingers
  indefinitely.

### Timers

* Elapsed time is derived from `startedAt`; nothing to migrate.
* The rest timer is local component state and is **lost on refresh** by design. If a merged page
  ever unmounts/remounts the exercise list when switching modes, running rest timers die — an
  acceptable but noteworthy behaviour change.

### Supersets

* Shared pure helpers; ids are renumbered on every assignment. Because renumbering is global to
  the list, a session-side reassignment can produce ids that no longer align with the routine's —
  `applySessionToRoutine` copies the session's ids verbatim, which is the intended behaviour.

### Exercise swapping

* `swapSessionExercise` rewrites only `exerciseId` + `name`, and is reused for routines
  (name is misleading — worth renaming later).
* The distinction between session-level and routine-level swap is carried entirely by
  `location.state.swap.kind` plus which storage key is patched. After the merge, `returnTo` must
  encode the mode as well as the route, or the user can return from a workout swap into edit mode.

### Mobile

* Only four media queries exist in the whole app; both editors are plain single-column flex
  layouts with identical page padding. Neither page branches on viewport size or assumes a
  particular navigation model, so the merge has **no mobile-specific blockers**. The one
  ergonomic concern is header crowding: edit mode already carries Duplicate/Export/Delete/Save,
  and workout mode adds Finish.

---

## 7. Recommended architecture

### 7.1 Mode representation

**Recommendation: derive mode from the presence of an active session object in page state,
mirrored in the URL as a search param.**

```
/routine/:id            → edit mode
/routine/:id?workout=1  → active workout mode (session in state + localStorage)
```

* **React state (`activeSession`) is the source of truth** — mode is `activeSession ? 'workout' : 'edit'`.
* The **search param is a mirror**, not the authority: it makes Back/refresh/share behave sanely
  and lets the recovery banner deep-link, but the page still validates against
  `readActiveWorkout()` before entering workout mode.

Rejected alternatives:

* *Route state (`location.state`)* — lost on refresh; the app already avoids relying on it for
  anything durable.
* *A dedicated context/provider* — the session is used by exactly one page subtree; a provider
  adds indirection for no consumer and conflicts with CLAUDE.md's state-management rules.
* *A nested child route (`/routine/:id/workout`)* — a second route is precisely what we are
  removing, and it forces a remount (killing rest timers) on mode change.
* *Separate page components behind a flag* — that is the current architecture with extra steps.

### 7.2 Page composition

Keep `RoutineEditor` and `SessionEditor` as the two mode bodies; introduce a thin container that
owns mode, the routine, and the session:

```
RoutinePage
  └─ RoutineWorkoutContainer          (loads routine; owns activeSession + mode)
       ├─ RoutineEditor   (mode === 'edit')     ← unchanged responsibilities + "Start Workout"
       └─ SessionEditor   (mode === 'workout')  ← unchanged responsibilities
```

This keeps the two reducers, the two persistence models, and the two dirty-guards physically
separate — the strongest available guarantee that routine edits cannot leak into a session.
Component-level deduplication (shared exercise-card shell) is a *later, optional* phase.

### 7.3 Start Workout semantics

Because the routine editor is not autosaved, Start must resolve unsaved edits explicitly:

* If `isDirty` → confirm: **Save & start** / **Start from saved routine** / **Cancel**.
  (Recommended default: Save & start, so the session snapshot matches what the user sees.)
* Never start from an unsaved in-memory routine without persisting it first — otherwise the
  session's `routineId` points at a document that never contained those exercises, and the
  post-workout "Update routine?" merge would produce surprising results.
* Reuse `startWorkout()` unchanged.

### 7.4 What happens to `/workout`

**Recommendation: retain it during migration, then convert it to a permanent redirect.**

1. During migration `/workout/:sessionId` keeps working unchanged (rollback safety).
2. Once `/routine/:id` can host a session, `/workout/:sessionId` becomes a **resolver**: read the
   session (localStorage first, then Firestore), then
   `navigate('/routine/{session.routineId}?workout=1', { replace: true })`.
3. Keep that redirect permanently rather than deleting the route:
   * PWA users have the URL in their service-worker-cached history and may have bookmarked it;
   * the recovery banner and the swap flow have shipped links to it;
   * a session whose routine was **deleted** has no `/routine/:id` to redirect to — the resolver
     is where that case is handled (fall back to a read-only history view or Home with a message).
   The route file is ~20 lines; permanent retention is cheaper than the edge cases it absorbs.

---

## 8. Migration plan

Each phase is independently shippable and independently revertable.

### Phase A — Shared plumbing (no behaviour change)

* **Objective**: remove incidental duplication that the merge would otherwise double.
* **Scope**: extract `parseInt10`/`parseFloatNum` to `src/utils/number.js`; extract
  `useCustomExercises()` hook; pass `customExercises` to `AddExercisePanel` in the routine editor
  (fixes the built-ins-only asymmetry); fix the two `exhaustive-deps` warnings.
* **Files**: `src/utils/number.js` (new), `src/hooks/useCustomExercises.js` (new),
  `SetRow.jsx`, `SessionSetRow.jsx`, `RoutineEditor.jsx`, `SessionEditor.jsx`.
* **Must NOT change**: routing, reducers, persistence, data shapes, CSS.
* **Verify**: `npm run check` + `npm test`; routine and workout pages behave identically;
  custom exercises now appear in the routine editor's picker.

### Phase B — Harden the finish flow

* **Objective**: make Finish crash-safe before it moves.
* **Scope**: persist to Firestore *before* dispatching `FINISH` (or keep the localStorage copy
  until `saveSession` resolves); allow retry after a failed finish; keep the "Update routine?"
  prompt unchanged.
* **Files**: `SessionEditor.jsx`, possibly `utils/activeWorkout.js`.
* **Must NOT change**: the session document shape, the opt-in routine-update semantics,
  `applySessionToRoutine`.
* **Verify**: finish offline → error shown, workout still recoverable, retry succeeds; finish
  online → exactly one history row; "Update routine?" Skip leaves the routine's `updatedAt`
  untouched.

### Phase C — Introduce the container and mode (workout mode still unreachable)

* **Objective**: put the mode switch in place with no user-visible change.
* **Scope**: add `RoutineWorkoutContainer` owning `{ routine, activeSession, mode }`; render
  `RoutineEditor` when `mode === 'edit'`; read `?workout=1` and `readActiveWorkout()` on mount but
  keep the workout branch behind a constant that is still `false`.
* **Files**: `src/features/routines/RoutineWorkoutContainer.jsx` (new), `RoutinePage.jsx`.
* **Must NOT change**: `/workout`, Home, reducers, Firestore.
* **Verify**: `/routine/:id` is byte-for-byte the same experience; `?workout=1` is inert.

### Phase D — Render workout mode on the routine route

* **Objective**: `/routine/:id?workout=1` renders the live `SessionEditor`.
* **Scope**: enable the workout branch; resolve the session from `readActiveWorkout()` matching
  `routineId`, else Firestore; keep `SessionEditor`'s own autosave, guards, and Finish.
  `/workout/:sessionId` still works in parallel.
* **Files**: `RoutineWorkoutContainer.jsx`, `SessionEditor.jsx` (props/back-navigation only).
* **Must NOT change**: session document shape, autosave key, the Finish flow, `/workout`.
* **Verify**: with an in-progress session, both URLs render the same live workout and share the
  same localStorage state; refresh on either is lossless; Finish from either writes one session.

### Phase E — Start Workout in edit mode

* **Objective**: the user can begin a workout without leaving the page.
* **Scope**: add the Start action + the unsaved-edits resolution from §7.3; switch mode in place
  (no remount of the container); mirror the mode into the URL with `replace`.
* **Files**: `RoutineEditor.jsx` (action), `RoutineWorkoutContainer.jsx` (transition).
* **Must NOT change**: `startWorkout`/`createSessionFromRoutine`; Home's Start button (still works).
* **Verify**: Start from a clean routine, from a dirty routine (both branches), and while another
  session is already active (must be blocked, matching Home's rule); exactly one session document
  per Start.

### Phase F — Repoint navigation

* **Objective**: every entry point leads to the merged page.
* **Scope**: Home Resume → `/routine/:routineId?workout=1`; Home Start → same page rather than
  `/workout/:id`; `ExercisesPage` swap return for workout swaps → the routine route + `workout=1`.
* **Files**: `HomePage.jsx`, `ExercisesPage.jsx`, `SessionEditor.jsx` (swap `state.returnTo`).
* **Must NOT change**: swap payload semantics, the two localStorage keys.
* **Verify**: swap during a workout preserves every logged value and returns to workout mode;
  swap during routine editing returns to edit mode with unsaved edits intact.

### Phase G — `/workout` becomes a redirect

* **Objective**: single canonical URL.
* **Scope**: replace `WorkoutSessionPage`'s body with the resolver from §7.4, including the
  deleted-routine fallback.
* **Files**: `WorkoutSessionPage.jsx`, `App.jsx` (route can become lazy).
* **Must NOT change**: `users/{uid}/workoutSessions` reads/writes.
* **Verify**: old bookmark → redirects to the live workout; completed session id → history or a
  clear message; session whose routine was deleted → no crash.

### Phase H — Optional cleanup

* **Objective**: remove the duplication the merge exposes.
* **Scope**: shared exercise-card shell behind a `mode` prop; rename `swapSessionExercise` →
  `swapExerciseIdentity`; delete `WorkoutSessionPage.module.css` if unused.
* **Must NOT change**: behaviour of either mode.
* **Verify**: full manual pass over both modes plus history rendering.

### Deliberately out of scope for the consolidation

Add-set-during-workout and editable session notes are **new features**, not migration work.
They belong in their own phase after Phase G, and both require `applySessionToRoutine` to stop
matching sets positionally.

---

## 9. Firestore impact

**No schema, rules, index, or migration changes are required.**

* Collections, document shapes, and field names are untouched — the consolidation is a routing
  and component-composition change. Sessions keep `routineId`; routines keep their exercise array.
* `firestore.rules` already grants owner-scoped read/write to `routines`, `workoutSessions`,
  `settings`, and `customExercises`. No new collection or access pattern is introduced.
* No new query shapes: `listCompletedSessions` still uses a single-field `orderBy('startedAt')`
  with client-side filtering, so no composite index is needed.
* Existing documents (including legacy sessions carrying `supersetGroup`) continue to render.

The only Firestore-adjacent consideration is **behavioural**: if a future phase decides an
in-progress session should sync mid-workout (to fix cross-device recovery), that would add
periodic writes to an existing document — still no schema change, but it is a separate decision
and is not part of this consolidation.
