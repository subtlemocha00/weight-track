import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { AuthContext } from './AuthContext'
import { auth } from '../services/firebase'
import { signInWithGoogleNative, signOutNative } from '../services/nativeGoogleAuth'

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      // Both paths end at the same `auth` instance above, so the signed-in user
      // is identical either way — only the way the credential is obtained
      // differs. The popup is impossible inside the Android WebView; see
      // services/nativeGoogleAuth.js.
      signInWithGoogle: async () => {
        if (Capacitor.isNativePlatform()) {
          await signInWithGoogleNative()
          return
        }
        await signInWithPopup(auth, googleProvider)
      },
      signOut: async () => {
        if (Capacitor.isNativePlatform()) {
          await signOutNative()
        }
        await firebaseSignOut(auth)
      }
    }),
    [user, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
