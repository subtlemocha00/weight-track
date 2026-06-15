import {
  createBlankSet,
  createRoutineExercise
} from './routineFactory'
import { assignSuperset } from '../../utils/supersets'

function touch(state) {
  return { ...state, updatedAt: Date.now() }
}

function reorderExercises(exercises) {
  return exercises.map((exercise, index) =>
    exercise.order === index ? exercise : { ...exercise, order: index }
  )
}

function updateExerciseAt(state, index, updater) {
  const next = state.exercises.slice()
  const current = next[index]
  if (!current) return state
  next[index] = updater(current)
  return touch({ ...state, exercises: next })
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

export function routineReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.routine

    case 'SET_NAME':
      return touch({ ...state, name: action.name })

    case 'ADD_EXERCISE': {
      const order = state.exercises.length
      const entry = createRoutineExercise(action.exercise, order)
      return touch({ ...state, exercises: [...state.exercises, entry] })
    }

    case 'REMOVE_EXERCISE': {
      const next = state.exercises.filter((_, i) => i !== action.index)
      return touch({ ...state, exercises: reorderExercises(next) })
    }

    case 'MOVE_EXERCISE': {
      const { from, to } = action
      if (from === to) return state
      if (from < 0 || from >= state.exercises.length) return state
      if (to < 0 || to >= state.exercises.length) return state
      const next = state.exercises.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return touch({ ...state, exercises: reorderExercises(next) })
    }

    case 'UPDATE_EXERCISE_NOTES':
      return updateExerciseAt(state, action.index, (exercise) => ({
        ...exercise,
        notes: action.notes
      }))

    case 'ASSIGN_SUPERSET': {
      const exercises = assignSuperset(state.exercises, action.index, action.supersetId)
      if (exercises === state.exercises) return state
      return touch({ ...state, exercises })
    }

    case 'ADD_SET':
      return updateExerciseAt(state, action.index, (exercise) => ({
        ...exercise,
        sets: [...exercise.sets, createBlankSet()]
      }))

    case 'REMOVE_SET':
      return updateExerciseAt(state, action.exerciseIndex, (exercise) => ({
        ...exercise,
        sets: exercise.sets.filter((_, i) => i !== action.setIndex)
      }))

    case 'UPDATE_SET':
      return updateSetAt(
        state,
        action.exerciseIndex,
        action.setIndex,
        (set) => ({ ...set, ...action.patch })
      )

    default:
      return state
  }
}
