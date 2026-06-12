/*
 * Reads the raw wrkout/exercises.json dataset (one folder + exercise.json per
 * exercise) and writes a single normalized JSON array to src/data/exercises.json.
 *
 * Run manually after dropping the raw dataset into .tmp/ — see README for setup.
 *
 *   node src/data/normalizeExercises.js [pathToRawExercisesDir]
 *
 * Default raw path: .tmp/exercises.json-master/exercises (matches the
 * extracted tarball layout documented in the README).
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_RAW_DIR = join(
  __dirname,
  '..',
  '..',
  '.tmp',
  'exercises.json-master',
  'exercises'
)
const OUTPUT_PATH = join(__dirname, 'exercises.json')

// Each primary muscle maps to a coarse body part used for filtering.
const MUSCLE_TO_BODY_PART = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  glutes: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abdominals: 'core',
  neck: 'neck'
}

// wrkout uses "expert"; the project's normalized contract uses "advanced".
const DIFFICULTY_MAP = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'advanced'
}

function folderToId(folder) {
  return folder
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function inferBodyPart(primaryMuscles) {
  if (!Array.isArray(primaryMuscles) || primaryMuscles.length === 0) {
    return 'other'
  }
  return MUSCLE_TO_BODY_PART[primaryMuscles[0]] || 'other'
}

function normalizeOne(raw, folderName) {
  return {
    id: folderToId(folderName),
    name: typeof raw.name === 'string' ? raw.name : folderName.replace(/_/g, ' '),
    bodyPart: inferBodyPart(raw.primaryMuscles),
    targetMuscles: Array.isArray(raw.primaryMuscles) ? raw.primaryMuscles : [],
    secondaryMuscles: Array.isArray(raw.secondaryMuscles)
      ? raw.secondaryMuscles
      : [],
    equipment: typeof raw.equipment === 'string' ? raw.equipment : 'other',
    instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
    difficulty: DIFFICULTY_MAP[raw.level] ?? null,
    isBodyweight: raw.equipment === 'body only',
    // Optional instructional video link. The wrkout dataset has none, so this
    // defaults to null; the field is kept so regenerating the dataset preserves
    // the app's normalized exercise shape (see normalizeExercise at runtime).
    videoUrl: typeof raw.videoUrl === 'string' ? raw.videoUrl : null
  }
}

function main() {
  const rawDir = process.argv[2] || process.env.WRKOUT_RAW_DIR || DEFAULT_RAW_DIR

  let stat
  try {
    stat = statSync(rawDir)
  } catch {
    console.error(`Cannot find raw dataset at: ${rawDir}`)
    console.error('See README for dataset setup instructions.')
    process.exit(1)
  }
  if (!stat.isDirectory()) {
    console.error(`Not a directory: ${rawDir}`)
    process.exit(1)
  }

  const folders = readdirSync(rawDir).filter((name) =>
    statSync(join(rawDir, name)).isDirectory()
  )

  const exercises = []
  const seenIds = new Set()

  for (const folder of folders) {
    const filePath = join(rawDir, folder, 'exercise.json')
    let raw
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch {
      // Skip folders without a readable exercise.json
      continue
    }

    const normalized = normalizeOne(raw, folder)

    if (seenIds.has(normalized.id)) {
      let suffix = 2
      while (seenIds.has(`${normalized.id}-${suffix}`)) suffix++
      normalized.id = `${normalized.id}-${suffix}`
    }
    seenIds.add(normalized.id)
    exercises.push(normalized)
  }

  exercises.sort((a, b) => a.name.localeCompare(b.name))

  writeFileSync(OUTPUT_PATH, JSON.stringify(exercises) + '\n')

  console.log(`Wrote ${exercises.length} exercises to ${OUTPUT_PATH}`)
}

main()
