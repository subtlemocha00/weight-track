# WeightTrack Architecture

# Frontend Stack

* React
* TypeScript
* Vite
* CSS Modules

---

# Backend Services

## Firebase Authentication

Used for:
* Google sign-in
* persistent authentication

## Firestore

Used for:
* routines
* workout history
* user settings

---

# Hosting

## Vercel

Used for:
* deployment
* CI/CD
* hosting

---

# PWA Requirements

The app must:
* be installable
* support offline usage
* cache static assets
* load quickly on mobile devices

---

# Exercise Data Strategy

Exercise data is stored locally in the application.

Primary dataset:
https://github.com/wrkout/exercises.json

The application should:
* preprocess the dataset if necessary
* normalize exercise structure
* provide fast local searching/filtering

The application should NOT depend on external exercise APIs during runtime.

---

# Data Model Concepts

## Routine

A reusable workout template.

Contains:
* ordered exercises
* sets/reps
* notes
* rest durations
* superset groupings

---

## Workout Session

A historical snapshot created from a routine when a workout begins.

Contains:
* completed set data
* actual weights/reps
* timestamps

Workout sessions should not mutate after completion.

---

# Firestore Structure

/users/{uid}

/users/{uid}/routines/{routineId}

/users/{uid}/workoutHistory/{sessionId}

---

# State Management

Use:
* local component state
* Context API
* custom hooks

Avoid large state libraries unless necessary.

---

# Routing

Expected routes:

/
/login
/home
/routine/new
/routine/:id
/workout/:sessionId
/history
/settings

---

# Styling Strategy

Use:
* CSS Modules
* semantic naming
* reusable component styling

Avoid:
* CSS frameworks
* inline styles
* oversized global stylesheets

---

# Performance Priorities

Prioritize:
* quick initial load
* responsive interactions
* low memory overhead
* minimal unnecessary rerenders

---

# Accessibility

The app should support:
* keyboard navigation
* accessible labels
* reasonable color contrast
* large mobile touch targets

---

# Mobile UX Priorities

Optimize for:
* one-handed usage
* minimal typing
* fast interaction
* low navigation depth

The app should feel close to a native mobile app experience.
