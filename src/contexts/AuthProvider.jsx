import { useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { AuthContext } from './AuthContext'
import { auth } from '../services/firebase'

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
      signInWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider)
      },
      signOut: async () => {
        await firebaseSignOut(auth)
      }
    }),
    [user, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
