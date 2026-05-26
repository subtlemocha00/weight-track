# WeightTrack — Cyberpunk UI Design Handoff

This document defines the complete visual design system for the WeightTrack PWA redesign. Implement it using CSS Modules (the project's existing pattern) and plain CSS custom properties. No UI framework required.

---

## Design Philosophy

**Theme: Neon-noir cyberpunk** — dark, moody, precise. Neon green is the primary accent; blue, pink, purple and orange appear as accent variants on specific elements. The light theme is a warm off-white "sun-bleached terminal" that uses the same neons at full saturation.

**Key principles:**
- Everything is angular. Replace all `border-radius` values with chamfered (diagonal corner-cut) shapes using `clip-path`.
- Glow effects are used sparingly — only on primary actions and completion states.
- Monospaced font for all numeric data (reps, weight, timers).
- Typography is tight and capitalised for labels; comfortable for body text.
- Tap feedback: a brief opacity flash on `:active` (not a scale transform).

---

## Fonts

```css
/* In index.html <head> */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

| Role | Font | Weight |
|---|---|---|
| UI text, labels, buttons | Space Grotesk | 400 / 600 / 700 / 800 |
| Numbers, data, timers | Space Mono | 400 / 700 |

```css
body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
}

.numericValue {
  font-family: 'Space Mono', 'Courier New', monospace;
}
```

---

## Color Tokens

Define these as CSS custom properties on `:root` and swap them for the light theme.

```css
/* global.css */

:root {
  /* Background layers */
  --bg:       #07070f;   /* page background */
  --surface:  #0c0c1c;   /* nav bars, card headers, secondary fills */
  --card:     #111126;   /* card background */
  --card-hov: #16163a;   /* card hover state */

  /* Borders */
  --border:   #1d1d38;   /* default border */
  --bright:   #28284e;   /* slightly brighter border for inputs */

  /* Text */
  --t1:  #dcd8f0;        /* primary text */
  --t2:  #6e6aa0;        /* secondary / metadata */
  --t3:  #363558;        /* dim / disabled / column headers */

  /* Dot grid */
  --dot: rgba(255, 255, 255, 0.032);

  /* Neons */
  --neon-green:  #00ff9d;
  --neon-blue:   #00c2ff;
  --neon-pink:   #ff2d78;
  --neon-purple: #b44aff;
  --neon-orange: #ff8c1a;
}

[data-theme="light"] {
  --bg:       #ece7dd;
  --surface:  #e2ddd3;
  --card:     #f5f0e7;
  --card-hov: #faf6ef;

  --border:  #c9c3b5;
  --bright:  #b5af9f;

  --t1:  #1a1628;
  --t2:  #5c5578;
  --t3:  #9898b8;

  --dot: rgba(0, 0, 0, 0.052);

  /* Neons stay the same — they pop on warm cream */
}
```

### Applying the theme

Toggle `data-theme="light"` on `<html>` or `<body>`. Default is dark (no attribute needed).

```js
// In your theme context / settings handler:
document.documentElement.setAttribute('data-theme', theme); // 'light' | ''
```

---

## Chamfered Corners (clip-path)

All interactive surfaces use chamfered corners — a diagonal cut replaces the top-right and bottom-left corners. Use `clip-path: polygon(...)` not `border-radius`.

```css
/* Utility — generates the 6-point chamfer polygon */
/* Replace N with the chamfer size in px */

.chamfer-6  { clip-path: polygon(0 0, calc(100% - 6px)  0, 100% 6px,  100% 100%, 6px  100%, 0 calc(100% - 6px));  }
.chamfer-8  { clip-path: polygon(0 0, calc(100% - 8px)  0, 100% 8px,  100% 100%, 8px  100%, 0 calc(100% - 8px));  }
.chamfer-10 { clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px)); }
.chamfer-12 { clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
```

**Chamfer size by element type:**

| Element | Chamfer |
|---|---|
| Page-level cards (exercise blocks, routine cards) | 10px |
| Buttons (primary / danger) | 9px |
| Small buttons (sm variant) | 6px |
| Icon buttons (34×34) | 5px |
| Inputs, text fields | 4–5px |
| Tags / chips | 3px |
| Phone frame (design mockup only) | 22px |

> ⚠️ `clip-path` clips `box-shadow` and `outline`. Use `border` for focus rings on inputs. Do not use `box-shadow` as a focus indicator — change `border-color` to `var(--neon-green)` on `:focus` instead.

---

## Dot Grid Background

Apply to page content areas (not nav bars or card surfaces).

```css
.pageBackground {
  background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## Global Resets / Shared Rules

```css
/* global.css */

*, *::before, *::after {
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: var(--bg);
  color: var(--t1);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

h1, h2, h3, h4, h5, h6, p {
  margin: 0;
}

button {
  font: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

a {
  color: inherit;
  text-decoration: none;
}

input, select, textarea {
  font-family: inherit;
  outline: none;
  color: var(--t1);
}

/* Tap flash */
@keyframes tapFlash {
  0%, 100% { opacity: 1; }
  40%       { opacity: 0.6; }
}
button:active {
  animation: tapFlash 0.12s ease-out;
}

/* Scrollbar */
::-webkit-scrollbar         { width: 4px; }
::-webkit-scrollbar-track   { background: transparent; }
::-webkit-scrollbar-thumb   { background: var(--border); border-radius: 2px; }

/* Remove default select arrow */
select { -webkit-appearance: none; appearance: none; }
```

---

## Components

### Button

Three variants: `primary`, `outline`, `danger`. Also a `ghost` variant for low-priority actions.

```css
/* Button.module.css */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 11px 22px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px));
  transition: all 0.08s;
  cursor: pointer;
  border: none;
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background: var(--neon-green);
  color: #07070f;
  border: 1.5px solid var(--neon-green);
  box-shadow: 0 0 18px rgba(0, 255, 157, 0.33);
}

.outline {
  background: transparent;
  color: var(--neon-green);
  border: 1.5px solid var(--neon-green);
}

.danger {
  background: transparent;
  color: var(--neon-pink);
  border: 1.5px solid var(--neon-pink);
}

.ghost {
  background: var(--surface);
  color: var(--t2);
  border: 1.5px solid var(--border);
}

/* Small modifier */
.sm {
  padding: 7px 13px;
  font-size: 11px;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}
```

---

### Icon Button (34×34)

Used for move up/down, remove exercise actions.

```css
.iconBtn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--t2);
  border: 1px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
  font-size: 15px;
  transition: all 0.08s;
}

.iconBtn:disabled {
  opacity: 0.22;
  cursor: not-allowed;
}

.iconBtn.danger { color: var(--neon-pink); }
```

---

### Unit Toggle (lb / kg)

```css
.unitToggle {
  display: flex;
  gap: 2px;
}

.unitOption {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  background: var(--surface);
  color: var(--t2);
  border: 1.5px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
  transition: all 0.1s;
}

.unitOption.active {
  background: var(--neon-green);
  color: #07070f;
  border-color: var(--neon-green);
}
```

---

### Input Fields

```css
.input {
  width: 100%;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  background: var(--card);
  color: var(--t1);
  border: 1.5px solid var(--bright);
  clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--neon-green);
  /* Note: box-shadow won't show through clip-path; border color is the focus indicator */
}

/* Numeric inputs (reps, weight) — monospaced, centered */
.numInput {
  padding: 7px 6px;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  text-align: center;
  background: var(--surface);
  border: 1.5px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
  transition: all 0.18s;
}

/* Completed set — input state */
.numInput.completed {
  background: rgba(0, 255, 157, 0.07);
  border-color: rgba(0, 255, 157, 0.33);
}
```

---

### Section Label (column headers, section titles)

```css
.label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t3);
}
```

---

### Tags / Exercise Meta Chips

```css
.tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t2);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 2px 7px;
  clip-path: polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px));
  white-space: nowrap;
}
```

---

### App Bar (sticky top, mobile)

```css
.appBar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.appBarLogo {
  flex: 1;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--neon-green);
  text-shadow: 0 0 22px rgba(0, 255, 157, 0.67);
  cursor: pointer;
}

.appBarActions {
  display: flex;
  gap: 10px;
  align-items: center;
}
```

---

### Page Content Area

```css
.page {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## Screen-by-Screen Implementation Notes

---

### 1. Login Screen

**Layout:** Full-screen centered column. Dot grid background.

```
[vertical centering]
  ── TRACK YOUR PROGRESS ──   (10px, letter-spacing: 0.32em, t2)
  WEIGHTTRACK                  (34px, 800, neon-green, text-shadow glow)
  [tagline p]                  (13px, t2, centered)
  [Continue with Google btn]   (primary, full-width, max-width 280px)
  v0.1 · ALPHA BUILD           (10px, t3, letter-spacing: 0.14em)
```

**Logo glow:**
```css
.logo {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--neon-green);
  text-shadow:
    0 0 40px rgba(0, 255, 157, 0.8),
    0 0 80px rgba(0, 255, 157, 0.33);
}
```

---

### 2. Home Screen (Routines List)

**Structure:**
```
<AppBar>
<Page>
  [row: "Your Routines" h1  |  "+ New" btn.sm.primary]
  [RoutineCard × N]
  [NavLink: Exercise Library →]
  [NavLink: Workout History →]
```

**RoutineCard:**
```css
.routineCard {
  display: flex;
  align-items: center;
  background: var(--card);
  border: 1px solid var(--border);
  clip-path: /* chamfer-10 */;
  padding: 13px 16px;
  gap: 12px;
}

/* Left accent bar */
.accentBar {
  width: 3px;
  align-self: stretch;
  border-radius: 1px;
  flex-shrink: 0;
  /* background and box-shadow set per card — rotate through neon colors */
}
/* Card 1: green. Card 2: blue. Card 3: purple. Card 4: orange. Then repeat. */
.accentBar.green  { background: var(--neon-green);  box-shadow: 0 0 8px rgba(0, 255, 157, 0.6); }
.accentBar.blue   { background: var(--neon-blue);   box-shadow: 0 0 8px rgba(0, 194, 255, 0.6); }
.accentBar.purple { background: var(--neon-purple); box-shadow: 0 0 8px rgba(180, 74, 255, 0.6); }
.accentBar.orange { background: var(--neon-orange); box-shadow: 0 0 8px rgba(255, 140, 26, 0.6); }
```

**NavLink rows (Library / History):**
```css
.navLink {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  clip-path: /* chamfer-8 */;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--t1);
}
.navLink .arrow { margin-left: auto; font-size: 15px; font-weight: 800; }
.navLink.toExercises .arrow { color: var(--neon-blue); }
.navLink.toHistory .arrow   { color: var(--neon-purple); }
```

---

### 3. Routine Editor

**Structure:**
```
<TopBar title="Edit Routine" back="← Back" right=[Delete btn.danger.sm | Save btn.primary.sm]>
<Page>
  [Label: ROUTINE NAME]
  [text input — large, font-weight 600]
  [AddExercisePanel — collapsible]
  [RoutineExerciseItem × N]
```

**TopBar:**
```css
.topBar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.topBarBack {
  color: var(--neon-green);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}
```

**AddExercisePanel toggle button (collapsed):**
```css
.addExToggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  clip-path: /* chamfer-8 */;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--t1);
  transition: all 0.15s;
}

.addExToggle.open {
  background: var(--card);
  border-color: var(--neon-green);
  color: var(--neon-green);
}
```

**AddExercisePanel body (expanded):**
```css
.addExBody {
  margin-top: 2px;
  background: var(--card);
  border: 1px solid var(--border);
  border-top: 2px solid rgba(0, 255, 157, 0.33);
  clip-path: /* chamfer-8 */;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

**Exercise result row in search panel:**
```css
.exResult {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  clip-path: /* chamfer-5 */;
  gap: 8px;
}
```

**RoutineExerciseItem:**
```css
.exerciseItem {
  background: var(--card);
  border: 1px solid var(--border);
  clip-path: /* chamfer-10 */;
  overflow: hidden; /* required — clip-path on children doesn't inherit */
}

.exerciseHeader {
  display: flex;
  align-items: center;
  padding: 11px 14px;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.exerciseOrder {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--t2);
  min-width: 22px;
}

.exerciseName {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exerciseBody {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

**Set row grid (inside exercise card):**
```css
.setGrid {
  display: grid;
  grid-template-columns: 22px 1fr 1fr 28px; /* # | reps | weight | remove */
  gap: 6px;
  align-items: center;
}

/* Header row */
.setGridHeader {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
```

---

### 4. Active Workout Session

**Structure:**
```
<WorkoutHeader>   (not AppBar — custom, shows routine name + elapsed time + Finish)
<Page>
  [SessionExerciseItem × N]
```

**WorkoutHeader:**
```css
.workoutHeader {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  gap: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.workoutTimer {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: var(--neon-green);
  text-shadow: 0 0 10px var(--neon-green);
}
```

**SessionExerciseItem** — same structure as RoutineExerciseItem but:
- Shows `done / total` count in header (monospaced, right-aligned)
- Card border changes to `var(--neon-green)` at 40% opacity when all sets complete
- Card header background changes to `rgba(0, 255, 157, 0.055)` when all done

```css
.exerciseItem.allDone {
  border-color: rgba(0, 255, 157, 0.4);
}

.exerciseItem.allDone .exerciseHeader {
  background: rgba(0, 255, 157, 0.055);
}

.exerciseItem.allDone .exerciseOrder {
  color: var(--neon-green);
  text-shadow: 0 0 10px var(--neon-green);
}
```

**Set grid for session — 4 columns: # | reps | weight | done**
```css
.sessionSetGrid {
  display: grid;
  grid-template-columns: 22px 1fr 1fr 40px;
  gap: 6px;
  align-items: center;
}
```

**Done (✓) toggle button:**
```css
.doneToggle {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  font-size: 17px;
  color: var(--t2);
  transition: all 0.15s;
  margin: 0 auto;
}

.doneToggle.checked {
  background: var(--neon-green);
  border-color: var(--neon-green);
  color: #07070f;
  box-shadow: 0 0 16px rgba(0, 255, 157, 0.47);
}
```

**Completed set row:**
```css
.setRow.completed {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.setRow.completed .numInput {
  background: rgba(0, 255, 157, 0.07);
  border-color: rgba(0, 255, 157, 0.33);
}

.setRow.completed .setIndex {
  color: var(--neon-green);
}
```

---

### 5. Exercise Library

**Structure:**
```
<AppBar>
<Page>
  [h1: Exercise Library]
  [search input]
  [filter selects — flex row, wrap]
  [result count label]
  [ExerciseCard (collapsible) × N]
```

**ExerciseCard — collapsed:**
```css
.exerciseCard {
  background: var(--card);
  border: 1.5px solid var(--border);
  clip-path: /* chamfer-8 */;
  overflow: hidden;
  transition: border-color 0.15s;
}

.exerciseCard.expanded {
  border-color: rgba(0, 194, 255, 0.47); /* blue accent when open */
}

.exerciseCardSummary {
  width: 100%;
  display: flex;
  align-items: flex-start;
  padding: 12px 14px;
  gap: 10px;
  cursor: pointer;
}

.expandIcon {
  font-size: 18px;
  line-height: 1;
  color: var(--t3);
  flex-shrink: 0;
  margin-top: 2px;
  transition: color 0.15s;
}

.exerciseCard.expanded .expandIcon {
  color: var(--neon-blue);
}
```

**ExerciseCard — expanded body:**
```css
.exerciseCardBody {
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detailRow {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.detailLabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t3);
  min-width: 90px;
  flex-shrink: 0;
}

.instructions {
  margin: 4px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.instructions li {
  font-size: 12px;
  line-height: 1.65;
  color: var(--t1);
}
```

---

### 6. Settings

**Structure:**
```
<AppBar>
<Page>
  [h1: Settings]
  [SettingsCard: Appearance]
    theme toggle (dark / light)
  [SettingsCard: Units]
    default unit (lb/kg toggle)
    bodyweight input
  [SettingsCard: Account]
    email display
    sign out btn.danger.sm
```

```css
.settingsCard {
  background: var(--card);
  border: 1px solid var(--border);
  clip-path: /* chamfer-10 */;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settingsDivider {
  height: 1px;
  background: var(--border);
}

.settingsRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settingsRowLabel {
  font-weight: 600;
  font-size: 14px;
  color: var(--t1);
}

.settingsRowSub {
  font-size: 11px;
  color: var(--t2);
  margin-top: 2px;
}
```

**Theme toggle buttons** — same pattern as unit toggle but labels are "Dark" / "Light".

---

### 7. History

**Structure:**
```
<AppBar>
<Page>
  [h1: History]
  [SessionHistoryCard × N]
```

**SessionHistoryCard:**
Same layout as RoutineCard on the home screen, but:
- Left accent bar is **purple** (`var(--neon-purple)`)
- Metadata shows date · duration · set count (Space Mono)
- No "Start" button — chevron `→` on the right

---

## Desktop Layout

Desktop is a wider version of mobile: same component language, same card styles, no bottom bar or separate desktop-specific layout.

```css
/* Desktop nav bar (replaces AppBar on wide screens) */
.desktopNav {
  display: flex;
  align-items: center;
  padding: 0 40px;
  height: 60px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.desktopNavLink {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t2);
  cursor: pointer;
  padding-bottom: 3px;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.desktopNavLink.active {
  color: var(--neon-green);
  border-bottom-color: var(--neon-green);
  text-shadow: 0 0 12px rgba(0, 255, 157, 0.53);
}

/* Content container */
.desktopContent {
  max-width: 780px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
```

**Breakpoint:** Apply desktop layout at `min-width: 768px`.

```css
@media (min-width: 768px) {
  .appBar { display: none; }     /* hide mobile app bar */
  .desktopNav { display: flex; } /* show desktop nav */
  .desktopContent { display: flex; }
}

@media (max-width: 767px) {
  .desktopNav { display: none; }
  .desktopContent { display: contents; } /* or just don't render it */
}
```

---

## Theme Persistence

Store theme in `localStorage` and read it on app startup.

```js
// ThemeContext or global.css init
const savedTheme = localStorage.getItem('wt-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : '');

// On change:
function applyTheme(theme) {
  localStorage.setItem('wt-theme', theme);
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
}
```

---

## CSS Module File Map

Suggested CSS module files to create or update:

| File | Purpose |
|---|---|
| `src/styles/global.css` | Tokens, resets, global rules, animations |
| `src/styles/chamfer.css` | Chamfer utility classes (optional — can be inline) |
| `src/components/Button.module.css` | Btn, IBtn variants |
| `src/components/UnitToggle.module.css` | lb/kg toggle |
| `src/layouts/AppLayout.module.css` | AppBar, TopBar, desktop nav |
| `src/pages/LoginPage.module.css` | Login screen layout + logo glow |
| `src/pages/HomePage.module.css` | Routine cards, nav links |
| `src/features/routines/RoutineEditor.module.css` | Editor layout |
| `src/features/routines/RoutineExerciseItem.module.css` | Exercise card + set grid |
| `src/features/routines/AddExercisePanel.module.css` | Panel toggle + search body |
| `src/features/workoutSessions/SessionEditor.module.css` | Workout header |
| `src/features/workoutSessions/SessionExerciseItem.module.css` | Session exercise card |
| `src/features/workoutSessions/SessionSetRow.module.css` | Done toggle, completed state |
| `src/features/exercises/ExerciseCard.module.css` | Library card, expand/collapse |
| `src/pages/SettingsPage.module.css` | Settings cards |
| `src/pages/HistoryPage.module.css` | History cards |

---

## Summary of Changes from Current App

| Area | Current | New |
|---|---|---|
| Font | System UI | Space Grotesk + Space Mono |
| Corners | `border-radius` | `clip-path` chamfer |
| Colors | White/black | CSS custom property token system (dark + light) |
| Buttons | Black filled / outlined | Neon green primary, outline, danger variants |
| Inputs | Default browser style | Chamfered, dark surface, green focus border |
| Card style | White with box-shadow | Dark card with border, dot-grid page bg |
| Routine cards | Plain list rows | Left accent bar with neon glow color-coded |
| Set "Done" | Checkbox | Custom chamfered toggle with glow |
| Completed sets | No visual distinction | Green tint + reduced opacity |
| Elapsed time | Text only | Space Mono + green text-shadow glow |
| Navigation | System link style | Neon green back links, desktop underline nav |
| Theme | None | CSS custom properties + localStorage |
| Tap feedback | Browser default | `tapFlash` keyframe animation |
