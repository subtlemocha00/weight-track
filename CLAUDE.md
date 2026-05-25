# CLAUDE.md

# WeightTrack

WeightTrack is a minimal, performance-focused workout tracking Progressive Web App (PWA).

The application is designed specifically for users who want:
* fast workout tracking
* reusable workout routines
* long-term progression tracking
* a distraction-free gym experience

WeightTrack intentionally avoids:
* social features
* gamification
* AI coaching
* influencer-style content
* calorie tracking
* lifestyle platform complexity
* engagement mechanics

The app should feel like a practical tool, not a social platform.

---

# Core Product Philosophy

## 1. Simplicity Over Feature Quantity

Every feature added to the app must justify its existence.

The app should remain:
* fast
* clean
* predictable
* easy to navigate
* easy to maintain

If a feature increases complexity without significantly improving the workout experience, it should not be added.

---

## 2. Workout Execution Is The Core Product

The most important screen in the application is the active workout screen.

All design and engineering decisions should prioritize:
* fast interaction
* low cognitive load
* minimal taps
* mobile ergonomics
* quick logging of workout data

The app should be optimized for real gym usage:
* one-handed interaction
* distracted users
* poor connectivity
* sweaty hands
* quick input

---

## 3. Offline-First Mindset

The app should remain functional in environments with poor internet connectivity.

Exercise data should be locally available.

The app should gracefully handle:
* temporary offline usage
* delayed sync
* intermittent network conditions

---

## 4. No Social Mechanics

The following features are permanently out of scope:

* social feeds
* likes
* comments
* followers
* public profiles
* workout sharing
* chat systems
* community systems
* public discovery systems

WeightTrack is a personal utility application only.

---

## 5. No Engagement Farming

The app must not use:
* streak systems
* achievement systems
* badges
* psychological retention mechanics
* artificial urgency
* addictive interaction patterns

The goal is usefulness, not engagement manipulation.

---

# Technology Stack

## Frontend

* React
* TypeScript
* Vite

## Styling

* CSS Modules
* Plain CSS
* No Tailwind
* No UI component frameworks

## Backend

* Firebase Authentication
* Firestore

## Hosting

* Vercel

## App Type

* Progressive Web App (PWA)

---

# State Management Rules

The application should remain intentionally simple.

Use:
* React state
* Context API
* custom hooks

Do NOT introduce:
* Redux
* Zustand
* MobX
* complex global state systems

unless the project genuinely becomes too complex without them.

---

# Data Fetching Rules

Do NOT introduce:
* TanStack Query
* React Query

unless there is a clear architectural need later.

Simple Firebase service functions and React hooks are preferred.

---

# Exercise Database

The application uses a local copy of the following dataset:

https://github.com/wrkout/exercises.json

The app should NOT depend on external exercise APIs during normal runtime.

Exercise data should be:
* local
* searchable
* filterable
* fast to access

---

# Core Features

## Included Features

### Authentication

* Google sign-in
* persistent login
* logout

### Exercise Database

* search exercises
* filter exercises
* browse exercises

### Routine Builder

* create routines
* edit routines
* delete routines
* reorder exercises
* assign sets/reps
* assign rest durations
* create supersets
* notes

### Workout Execution

* start workout
* log weights/reps
* modify workout during execution
* complete workout
* optionally update original routine after workout

### Workout History

* historical workout sessions
* progression tracking
* previous performance visibility

### User Settings

* metric/imperial units
* bodyweight settings
* optional bodyweight display
* default units

### PWA Features

* installable
* mobile optimized
* offline-capable

---

# Explicitly Out Of Scope

The following features should NOT be suggested or implemented:

* calorie tracking
* nutrition tracking
* meal planning
* wearable integration
* Apple Health integration
* Google Fit integration
* AI coaching
* AI workout generation
* social features
* subscriptions
* public APIs
* ads
* ecommerce
* content feeds
* video platforms
* livestreaming
* influencer systems
* achievement systems
* challenges
* leaderboards
* blockchain/web3
* cryptocurrency
* chat systems
* friend systems

---

# UI/UX Guidelines

## Design Goals

The UI should feel:
* lightweight
* responsive
* calm
* practical
* efficient

Avoid:
* visual clutter
* excessive animation
* unnecessary gradients
* oversized cards
* excessive whitespace
* flashy effects

---

## Mobile-First

The app should be designed mobile-first.

Desktop support is secondary.

---

## Interaction Design

Minimize:
* taps
* scrolling
* typing
* navigation depth

Avoid:
* nested modals
* multi-step flows
* hidden critical actions

---

# Architecture Rules

## Separation Of Concepts

Workout routines and workout sessions are separate entities.

### Routine

Reusable template.

### Workout Session

Historical snapshot created when a workout begins.

Workout history must remain immutable.

---

# Code Organization

Use feature-based organization where appropriate.

Example structure:

src/
  components/
  contexts/
  data/
  features/
  hooks/
  layouts/
  pages/
  services/
  styles/
  types/
  utils/

---

# Styling Rules

Use:
* CSS Modules
* semantic class naming
* reusable utility classes only when appropriate

Avoid:
* inline styles
* massive global CSS files
* CSS frameworks

---

# Development Priorities

Implementation order should generally follow:

1. Foundation/setup
2. Authentication
3. Exercise database
4. Routine builder
5. Workout execution
6. Workout history
7. Settings
8. Polish/refinement

---

# Engineering Expectations

Code should prioritize:
* clarity
* maintainability
* simplicity
* predictable structure

Avoid:
* premature optimization
* abstraction for abstraction's sake
* unnecessary libraries
* overengineering

Prefer straightforward solutions.

---

# Important Constraint

WeightTrack is intentionally NOT trying to become:
* an all-in-one fitness platform
* a social network
* a startup engagement machine

It is a focused workout tracking tool.

All future development decisions should reinforce this identity.

# ADDENDUM — Phase Control Enforcement

## Architecture Stability Rule

The project is being built in strict phases.

Each phase MUST be completed independently before the next begins.

Do NOT combine phase responsibilities.

---

## Current Phase Boundaries

### Phase 1

* Infrastructure only
* No product logic

### Phase 2

* Exercise dataset
* Search + filtering only

### Phase 3 (CURRENT FOCUS)

* Routine creation and editing ONLY
* No workout execution
* No history
* No analytics

---

## Forbidden Cross-Phase Logic

You must NOT:

* implement workout session tracking during routine work
* persist exercise performance data in routines
* build history features early
* introduce timers or metrics systems
* introduce engagement mechanics

---

## Data Separation Rule (CRITICAL)

These are separate concepts:

### Routine (Phase 3)

* template structure
* editable
* reusable

### Workout Session (FUTURE PHASE)

* immutable record of execution
* performance tracking
* historical data

Never merge these.

---

## Engineering Constraint

If a feature feels like it belongs in a future phase:

STOP and stub it only.

Do NOT implement it early.

---

## Scope Discipline Rule

If a request expands scope beyond the current phase:

* do not implement it
* do not partially implement it
* explicitly defer it to the correct phase

## Authentication Assumption Rule

Firebase Authentication is fully implemented.

All Firestore operations must assume:
* a real authenticated user exists
* uid is sourced from firebase auth currentUser
* no mock or placeholder user identifiers are allowed

If auth state is not ready, operations must be deferred or disabled, not simulated.
