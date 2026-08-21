import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from './firebase'

/**
 * Google sign-in for the Capacitor Android build.
 *
 * `signInWithPopup` cannot work inside the Android WebView: there is no popup to
 * open, so Firebase falls back to an external browser and the credential has no
 * route back to the `https://localhost` origin the app runs on. The promise then
 * never settles and the button sticks on SIGNING IN.
 *
 * So the native Google chooser supplies the credential instead, and that
 * credential becomes a session on the SAME `auth` instance AuthProvider already
 * observes. Same project, same Google account, same uid — native packaging
 * changes how the credential is obtained, not who the user is.
 *
 * `skipNativeAuth: true` in capacitor.config.json stops the plugin opening its
 * own native Firebase session, which leaves the JS SDK as the single source of
 * truth rather than two sessions to keep in step.
 *
 * The plugin is imported dynamically because registering a Capacitor plugin is
 * an import-time side effect: a static import would pull it into the web bundle
 * that never runs it.
 *
 * @returns the Firebase credential result, or null if the user backed out
 */
export async function signInWithGoogleNative() {
  const { FirebaseAuthentication } = await import(
    '@capacitor-firebase/authentication'
  )

  let result
  try {
    result = await FirebaseAuthentication.signInWithGoogle()
  } catch (error) {
    // Dismissing the chooser is a normal user action, not a failure. Returning
    // lets the caller clear its loading state and stay on the sign-in screen.
    // Anything else is a real problem and belongs to the caller.
    if (isCancellation(error)) return null
    throw error
  }

  // Some dismissals resolve instead of throwing, with nothing usable attached.
  const idToken = result?.credential?.idToken
  if (!idToken) return null

  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
}

/**
 * Clear the native Google session.
 *
 * Without this the next sign-in silently reuses the remembered account instead
 * of showing the chooser, so signing out would not really let you switch users.
 *
 * Best-effort by design: a native failure must not stop the caller clearing the
 * JS session, or the UI would sit signed in with no way out.
 */
export async function signOutNative() {
  try {
    const { FirebaseAuthentication } = await import(
      '@capacitor-firebase/authentication'
    )
    await FirebaseAuthentication.signOut()
  } catch (error) {
    console.warn('[auth] native sign-out failed:', error)
  }
}

/**
 * Whether an error is the user backing out of the account chooser.
 *
 * The plugin exposes no stable cancellation contract — Android reports 12501 and
 * the message wording varies by platform and version — so match loosely and err
 * towards staying quiet. A genuine error misread as a cancellation still leaves
 * the user signed out on the sign-in screen, which is where this lands them too.
 */
export function isCancellation(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === '12501' ||
    message.includes('cancel') ||
    message.includes('dismiss') ||
    message.includes('closed')
  )
}
