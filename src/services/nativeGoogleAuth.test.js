import { beforeEach, describe, expect, it, vi } from 'vitest'

// The plugin and Firebase are both stubbed: these tests are about how the native
// flow reacts to what the plugin hands back, not about Google or Firebase.
const nativeSignInWithGoogle = vi.fn()
const nativeSignOut = vi.fn()
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: (...args) => nativeSignInWithGoogle(...args),
    signOut: (...args) => nativeSignOut(...args)
  }
}))
vi.mock('./firebase', () => ({ auth: { name: 'shared-auth' } }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn((idToken) => ({ from: idToken })) },
  signInWithCredential: vi.fn(async () => ({ user: { uid: 'uid-1' } }))
}))

import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import {
  isCancellation,
  signInWithGoogleNative,
  signOutNative
} from './nativeGoogleAuth'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithGoogleNative', () => {
  it('exchanges the native idToken for a session on the shared auth instance', async () => {
    nativeSignInWithGoogle.mockResolvedValue({
      credential: { idToken: 'google-id-token' }
    })

    await signInWithGoogleNative()

    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token')
    const [authArg, credentialArg] = signInWithCredential.mock.calls[0]
    // The same instance AuthProvider observes, so the uid matches the web flow.
    expect(authArg).toEqual({ name: 'shared-auth' })
    expect(credentialArg).toEqual({ from: 'google-id-token' })
  })

  it('signs nothing in when the chooser resolves without a token', async () => {
    nativeSignInWithGoogle.mockResolvedValue({ credential: {} })

    await expect(signInWithGoogleNative()).resolves.toBeNull()
    expect(signInWithCredential).not.toHaveBeenCalled()
  })

  it('treats a cancellation as a quiet no-op rather than an error', async () => {
    nativeSignInWithGoogle.mockRejectedValue({ code: '12501' })

    await expect(signInWithGoogleNative()).resolves.toBeNull()
    expect(signInWithCredential).not.toHaveBeenCalled()
  })

  it('rethrows a genuine sign-in failure so the caller can surface it', async () => {
    nativeSignInWithGoogle.mockRejectedValue(new Error('DEVELOPER_ERROR'))

    await expect(signInWithGoogleNative()).rejects.toThrow('DEVELOPER_ERROR')
    expect(signInWithCredential).not.toHaveBeenCalled()
  })
})

describe('signOutNative', () => {
  it('clears the native session so the next sign-in re-prompts', async () => {
    nativeSignOut.mockResolvedValue(undefined)

    await signOutNative()

    expect(nativeSignOut).toHaveBeenCalled()
  })

  it('resolves even when the native call fails, so the JS session can still clear', async () => {
    nativeSignOut.mockRejectedValue(new Error('no native session'))

    await expect(signOutNative()).resolves.toBeUndefined()
  })
})

describe('isCancellation', () => {
  it('recognises the Android cancellation code', () => {
    expect(isCancellation({ code: '12501' })).toBe(true)
  })

  it('recognises the varied cancellation wordings', () => {
    expect(isCancellation(new Error('The user canceled the sign-in flow'))).toBe(
      true
    )
    expect(isCancellation(new Error('Sign in dismissed'))).toBe(true)
    expect(isCancellation(new Error('The popup was closed'))).toBe(true)
  })

  it('leaves a genuine failure alone', () => {
    expect(isCancellation(new Error('DEVELOPER_ERROR'))).toBe(false)
    expect(isCancellation(undefined)).toBe(false)
  })
})
