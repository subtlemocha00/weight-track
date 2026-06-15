import { createSessionExercise } from './sessionFactory'

function reorderOrders(exercises) {
  return exercises.map((exercise, index) =>
    exercise.order === index ? exercise : { ...exercise, order: index }
  )
}

function updateExerciseAt(state, index, updater) {
  const next = state.exercises.slice()
  const current = next[index]
  if (!current) return state
  next[index] = updater(current)
  return { ...state, exercises: next }
}

function updateSetAt(state, exerciseIndex, setIndex, updater) {
  return updateExerciseAt(state, exerciseIndex, (exercise) => {
    const nextSets = exercise.sets.slice()
    const current = nextSets[setIndex]
    if (!current) return exercise
    nextSets[setIndex] = updater(current)
    return { ...exercise, sets: nextSets }
  })
}

export function sessionReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.session

    case 'UPDATE_SET':
      return updateSetAt(
        state,
        action.exerciseIndex,
        action.setIndex,
        (set) => ({ ...set, ...action.patch })
      )

    case 'TOGGLE_SET_COMPLETED':
      return updateSetAt(
        state,
        action.exerciseIndex,
        action.setIndex,
        (set) => {
          const nextCompleted = !set.completed
          return {
            ...set,
            completed: nextCompleted,
            timestamp: nextCompleted ? Date.now() : null
          }
        }
      )

    case 'SET_EXERCISE_UNIT':
      return updateExerciseAt(state, action.index, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, unit: action.unit }))
      }))

    case 'ADD_EXERCISE': {
      // Add an exercise to the active session only. Completed sets on existing
      // exercises are untouched; the new exercise begins fully uncompleted.
      const order = state.exercises.length
      const entry = createSessionExercise(action.exercise, order)
      return { ...state, exercises: [...state.exercises, entry] }
    }

    case 'REMOVE_EXERCISE': {
      const next = state.exercises.filter((_, i) => i !== action.index)
      if (next.length === state.exercises.length) return state
      return { ...state, exercises: reorderOrders(next) }
    }

    case 'MOVE_EXERCISE': {
      const { from, to } = action
      if (from === to) return state
      if (from < 0 || from >= state.exercises.length) return state
      if (to < 0 || to >= state.exercises.length) return state
      const next = state.exercises.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...state, exercises: reorderOrders(next) }
    }

    case 'FINISH':
      return {
        ...state,
        status: 'completed',
        completedAt: action.completedAt ?? Date.now()
      }

    default:
      return state
  }
}
