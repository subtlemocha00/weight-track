# WeightTrack Product Specification

# Product Summary

WeightTrack is a workout routine and workout tracking Progressive Web App focused on simplicity, speed, and long-term usability.

The app is intended for gym users who want:
* reusable routines
* fast workout logging
* progression tracking
* mobile-first usability

The application intentionally avoids social and engagement-driven mechanics.

---

# Primary User Goals

Users should be able to:

1. Create reusable workout routines
2. Quickly start workouts
3. Log sets/reps/weight efficiently
4. Review workout history
5. Track progression over time
6. Use the app easily on mobile devices
7. Use the app with poor internet connectivity

---

# User Flow

## New User

### Step 1

User opens app.

### Step 2

User signs in with Google authentication.

### Step 3

User arrives on home screen.

Since no routines exist yet:
* sample routines are displayed
* CTA for creating first routine is displayed

---

# Sample Routines

The application should provide starter templates such as:
* leg day
* chest day
* back day
* arm day
* core day

These are intended as beginner starting points only.

---

# Routine Creation Flow

User can:
* create routine name
* search exercises
* filter exercises
* add exercises to routine
* reorder exercises
* define sets/reps
* define rest durations
* create supersets
* add notes

---

# Workout Flow

User starts workout from home screen.

Workout screen displays:
* exercises
* sets
* reps
* target weights
* notes
* rest guidance

Users can:
* log actual weights/reps
* modify exercise ordering
* adjust workout during execution

After completion:
* workout history is saved
* user can optionally apply changes back to original routine

---

# Workout History

The app stores:
* completed workouts
* timestamps
* exercise performance
* weight progression

Workout history should remain immutable.

---

# Units System

The app supports:
* imperial
* metric

Users may optionally specify units per exercise.

Bodyweight exercises should support:
* bodyweight only
* bodyweight + added weight

Example:
* "Bodyweight"
* "Bodyweight + 25 lb"

---

# Core Screens

## Public

* Landing/Login

## Authenticated

* Home
* Create Routine
* Edit Routine
* Workout Session
* Workout History
* Settings

---

# Future Features (Allowed)

The following MAY be added later if they remain lightweight:
* basic rest timer
* exercise thumbnails
* progression charts

---

# Permanently Excluded Features
* social networking
* likes/comments
* follower systems
* calorie tracking
* nutrition tracking
* AI coaching
* wearable integrations
* achievements/gamification
* public profiles
* subscriptions
* advertisements

---

# Success Criteria

WeightTrack succeeds if:
* it is fast
* easy to use in a gym
* easy to maintain
* reliable over time
* distraction-free
* efficient for logging workouts
