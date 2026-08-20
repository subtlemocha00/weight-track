import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'

export const DEFAULT_SETTINGS = {
  weightUnit: 'lb',
  distanceUnit: 'km',
  restTimerEnabled: true,
  defaultRestSeconds: 90,
  themePreference: 'system'
}

/** Shortest countdown worth showing. Below it, rest is switched off instead. */
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
    restTimerEnabled:
      typeof partial?.restTimerEnabled === 'boolean'
        ? partial.restTimerEnabled
        : DEFAULT_SETTINGS.restTimerEnabled,
    defaultRestSeconds: clampRestSeconds(
      Number.isFinite(partial?.defaultRestSeconds)
        ? partial.defaultRestSeconds
        : DEFAULT_SETTINGS.defaultRestSeconds
    ),
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
 * 0 is a real setting, not a rejected one: it means no default rest. Anything
 * else is a countdown, so it is held at or above REST_SECONDS_MIN — a 2-second
 * rest is a mistyped number, not an intention. Unreadable input falls back to
 * the default rather than silently switching rest off.
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
