import { describe, expect, it } from 'vitest'
import { resolveRestSeconds } from './restDuration'

const on = { restTimerEnabled: true, defaultRestSeconds: 90 }
const off = { restTimerEnabled: false, defaultRestSeconds: 90 }
const noDefault = { restTimerEnabled: true, defaultRestSeconds: 0 }

describe('resolveRestSeconds', () => {
  it("uses the set's own rest ahead of the setting", () => {
    expect(resolveRestSeconds({ restSeconds: 45 }, on)).toBe(45)
  })

  it('falls back to the setting when the set has no rest of its own', () => {
    expect(resolveRestSeconds({ restSeconds: null }, on)).toBe(90)
    expect(resolveRestSeconds({}, on)).toBe(90)
  })

  it("shows a set's own rest even with the global timer switched off", () => {
    expect(resolveRestSeconds({ restSeconds: 45 }, off)).toBe(45)
  })

  it('shows nothing for a blank set with the global timer switched off', () => {
    expect(resolveRestSeconds({ restSeconds: null }, off)).toBe(0)
  })

  it('treats a 0 default as no rest for blank sets, leaving the rest alone', () => {
    expect(resolveRestSeconds({ restSeconds: null }, noDefault)).toBe(0)
    expect(resolveRestSeconds({ restSeconds: 30 }, noDefault)).toBe(30)
  })

  it('treats 0 on a set as a deliberate no-rest, not a blank', () => {
    expect(resolveRestSeconds({ restSeconds: 0 }, on)).toBe(0)
  })

  it('ignores unusable values on the set and falls back', () => {
    expect(resolveRestSeconds({ restSeconds: -10 }, on)).toBe(90)
    expect(resolveRestSeconds({ restSeconds: NaN }, on)).toBe(90)
    expect(resolveRestSeconds({ restSeconds: '60' }, on)).toBe(90)
  })

  it('needs no settings to honour a rest written on the set', () => {
    expect(resolveRestSeconds({ restSeconds: 60 }, undefined)).toBe(60)
    expect(resolveRestSeconds({ restSeconds: null }, undefined)).toBe(0)
  })
})
