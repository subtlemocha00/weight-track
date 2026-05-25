import exercises from '../../data/exercises.json'

let byIdIndex = null
function getByIdIndex() {
  if (byIdIndex) return byIdIndex
  byIdIndex = new Map()
  for (const ex of exercises) byIdIndex.set(ex.id, ex)
  return byIdIndex
}

let filterOptionsCache = null

export function getAllExercises() {
  return exercises
}

export function getExerciseById(id) {
  if (!id) return null
  return getByIdIndex().get(id) ?? null
}

export function searchExercises(query) {
  if (!query) return exercises
  const q = String(query).trim().toLowerCase()
  if (!q) return exercises
  return exercises.filter((ex) => ex.name.toLowerCase().includes(q))
}

export function filterExercises(filters = {}) {
  const { query, bodyPart, muscle, equipment, difficulty } = filters
  const q = query ? String(query).trim().toLowerCase() : ''

  if (!q && !bodyPart && !muscle && !equipment && !difficulty) {
    return exercises
  }

  return exercises.filter((ex) => {
    if (q && !ex.name.toLowerCase().includes(q)) return false
    if (bodyPart && ex.bodyPart !== bodyPart) return false
    if (equipment && ex.equipment !== equipment) return false
    if (difficulty && ex.difficulty !== difficulty) return false
    if (muscle) {
      const hit =
        ex.targetMuscles.includes(muscle) ||
        ex.secondaryMuscles.includes(muscle)
      if (!hit) return false
    }
    return true
  })
}

export function getFilterOptions() {
  if (filterOptionsCache) return filterOptionsCache

  const bodyParts = new Set()
  const muscles = new Set()
  const equipmentValues = new Set()
  const difficulties = new Set()

  for (const ex of exercises) {
    bodyParts.add(ex.bodyPart)
    ex.targetMuscles.forEach((m) => muscles.add(m))
    ex.secondaryMuscles.forEach((m) => muscles.add(m))
    equipmentValues.add(ex.equipment)
    if (ex.difficulty) difficulties.add(ex.difficulty)
  }

  const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced']

  filterOptionsCache = {
    bodyParts: [...bodyParts].sort(),
    muscles: [...muscles].sort(),
    equipment: [...equipmentValues].sort(),
    difficulties: DIFFICULTY_ORDER.filter((d) => difficulties.has(d))
  }

  return filterOptionsCache
}
