import { useEffect } from "react"
import { Keyboard, Platform } from "react-native"
import * as Sentry from "@sentry/react-native"

/**
 * iOS replay records keyboard taps even over masked views, so the phone number and code could be
 * read off the keypad (getsentry/sentry-react-native#6299). Pausing stops the touch tracker.
 * Android's keyboard is a separate process whose touches replay never sees.
 */
export function usePauseReplayWhileTyping() {
  useEffect(() => {
    if (Platform.OS !== "ios") return

    const pause = () => Sentry.getReplay()?.pause()
    const resume = () => Sentry.getReplay()?.resume()

    if (Keyboard.isVisible()) pause()
    // Fires before the keyboard animates in, so no tap lands before the pause
    const showListener = Keyboard.addListener("keyboardWillShow", pause)
    const hideListener = Keyboard.addListener("keyboardDidHide", resume)

    return () => {
      showListener.remove()
      hideListener.remove()
      resume()
    }
  }, [])
}
