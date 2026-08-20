import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'

export const DEFAULT_SETTINGS = {
  weightUnit: 'lb',
  distanceUnit: 'km',
  defaultRestSeconds: 90,
  themePreference: 'system'
}

/** Shortest countdown that can be set. Below it there is only 0 — no rest. */
export const REST_SECONDS_MIN = 1
export const REST_SECONDS_MAX = 600
/**
 * No default rest: sets that carry no rest of their own get no timer. Sets
 * given a rest in their routine still get theirs — see restDuration.
 */
export const REST_SECONDS_OFF = 0

function settingsDocRef(uid) {
  return doc(firestore, 'users', uid, 'settings', 'preferences')
}

/**
 * The default rest a stored settings doc is asking for.
 *
 * `restTimerEnabled` used to switch the timer off independently of the
 * duration; a duration of 0 says the same thing, so the flag is gone. A doc
 * still carrying it off is read as the 0 it now means, rather than quietly
 * turning that user's rests back on. The flag is not written back — the first
 * save drops it.
 */
function restSecondsFrom(partial) {
  if (partial?.restTimerEnabled === false) return 0
  return Number.isFinite(partial?.defaultRestSeconds)
    ? partial.defaultRestSeconds
    : DEFAULT_SETTINGS.defaultRestSeconds
}

/**
 * Merge a Firestore payload with DEFAULT_SETTINGS so callers always receive
 * a fully-populated object even if older docs predate newer fields.
 */
function withDefaults(partial) {
  return {
    weightUnit:
      partial?.weightUnit === 'kg' || partial?.weightUnit === 'lb'
        ? partial.weightUnit
        : DEFAULT_SETTINGS.weightUnit,
    distanceUnit:
      partial?.distanceUnit === 'km' || partial?.distanceUnit === 'mi'
        ? partial.distanceUnit
        : DEFAULT_SETTINGS.distanceUnit,
    defaultRestSeconds: clampRestSeconds(restSecondsFrom(partial)),
    themePreference:
      partial?.themePreference === 'light' ||
        partial?.themePreference === 'dark' ||
        partial?.themePreference === 'system'
        ? partial.themePreference
        : DEFAULT_SETTINGS.themePreference
  }
}

/**
 * Bring a typed rest duration into range.
 *
 * 0 is a real setting, not a rejected one: it means no default rest. Any other
 * value is a countdown and is kept as typed, from one second up to the maximum.
 * Unreadable input falls back to the default rather than silently switching
 * rest off.
 */
export function clampRestSeconds(value) {
  // A cleared input is not a request for 0 — it is no answer at all.
  if (typeof value === 'string' && value.trim() === '') {
    return DEFAULT_SETTINGS.defaultRestSeconds
  }
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.defaultRestSeconds
  if (n <= 0) return REST_SECONDS_OFF
  if (n < REST_SECONDS_MIN) return REST_SECONDS_MIN
  if (n > REST_SECONDS_MAX) return REST_SECONDS_MAX
  return n
}

export async function getSettings(uid) {
  const snap = await getDoc(settingsDocRef(uid))
  if (!snap.exists()) return { ...DEFAULT_SETTINGS }
  return withDefaults(snap.data())
}

export async function saveSettings(uid, settings) {
  const sanitized = withDefaults(settings)
  await setDoc(settingsDocRef(uid), sanitized)
  return sanitized
}
