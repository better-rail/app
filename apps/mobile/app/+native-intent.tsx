/**
 * Expo Router's native deep-link handler, invoked for every incoming URL before
 * the router navigates.
 *
 * Widget and live-activity links (iOS `widget://` / `liveactivity://`, Android
 * `betterrail://modern_widget4x2?…`) are handled in `use-deep-linking.ts` since
 * they depend on app state. Returning `null` stops Expo Router from resolving
 * them itself, which would reset the stack or land on the not-found screen.
 */
const MANUAL_DEEP_LINK = /^(widget|liveactivity):\/\/|^betterrail:\/\/((modern_)?widget\w*|liveactivity)([/?#]|$)/

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    if (MANUAL_DEEP_LINK.test(path.toLowerCase())) {
      return null
    }
  } catch {
    // Never throw from here — it can crash the app on launch. Fall through to
    // the default behavior on any unexpected input.
  }

  return path || null
}
