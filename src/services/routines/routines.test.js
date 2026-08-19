import { beforeEach, describe, expect, it, vi } from 'vitest'

// Firestore itself is stubbed: these tests are about what the service asks
// Firestore to write, not about Firestore.
vi.mock('../firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db, ...path) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}))

import { setDoc, updateDoc } from 'firebase/firestore'
import { saveRoutine, setRoutineFavorite } from './index'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setRoutineFavorite', () => {
  it('writes the routine document', async () => {
    await setRoutineFavorite('user-1', 'routine-1', true)
    const [ref] = updateDoc.mock.calls[0]
    expect(ref.path).toBe('users/user-1/routines/routine-1')
  })

  it('writes nothing but the favourite field', async () => {
    await setRoutineFavorite('user-1', 'routine-1', true)
    expect(updateDoc).toHaveBeenCalledTimes(1)
    expect(updateDoc.mock.calls[0][1]).toEqual({ favorite: true })
  })

  it('leaves the last-edit timestamp alone', async () => {
    // Starring is not an edit: nothing here may bump updatedAt, or a favourite
    // would jump to the top of the ordering it is supposed to keep its place in.
    await setRoutineFavorite('user-1', 'routine-1', true)
    await setRoutineFavorite('user-1', 'routine-1', false)
    for (const [, payload] of updateDoc.mock.calls) {
      expect(payload).not.toHaveProperty('updatedAt')
      expect(payload).not.toHaveProperty('createdAt')
    }
  })

  it('does not rewrite the whole document', async () => {
    // A full setDoc would need a copy of the routine, which the list holds and
    // an open editor may have moved past.
    await setRoutineFavorite('user-1', 'routine-1', true)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('normalizes whatever it is handed to a boolean', async () => {
    await setRoutineFavorite('user-1', 'routine-1', 'yes')
    await setRoutineFavorite('user-1', 'routine-1', undefined)
    expect(updateDoc.mock.calls[0][1]).toEqual({ favorite: false })
    expect(updateDoc.mock.calls[1][1]).toEqual({ favorite: false })
  })
})

describe('saveRoutine', () => {
  it('carries the favourite state through an ordinary save', async () => {
    // Editing a starred routine, or applying a finished workout to it, must not
    // quietly unstar it.
    const saved = await saveRoutine('user-1', {
      id: 'routine-1',
      name: 'Push Day',
      favorite: true,
      exercises: []
    })
    expect(saved.favorite).toBe(true)
    expect(setDoc.mock.calls[0][1].favorite).toBe(true)
  })
})
