import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'

export const DEFAULT_SETTINGS = {
  weightUnit: 'lb',
  restTimerEnabled: true,
  defaultRestSeconds: 90,
  themePreference: 'system'
}

export const REST_SECONDS_MIN = 5
export const REST_SECONDS_MAX = 600

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

export function clampRestSeconds(value) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.defaultRestSeconds
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
