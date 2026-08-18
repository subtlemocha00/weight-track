import { createContext } from 'react'

/**
 * What `confirm()` resolves to when the user picks the optional third action.
 *
 * A prompt is normally a yes/no: true for confirm, false for cancel, ESC or the
 * backdrop. A prompt that offers `altLabel` has a third answer that is neither —
 * "end this, but the other way" — and it resolves to this instead. Only ever
 * returned to a caller that asked for the third button.
 */
export const CONFIRM_ALT = 'alt'

export const ConfirmModalContext = createContext(null)
