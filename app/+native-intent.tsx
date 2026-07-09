/**
 * Expo Router's native deep-link handler, invoked for every incoming URL before
 * the router navigates.
 *
 * The `widget://` and `liveactivity://` schemes are handled manually in
 * `use-deep-linking.ts`, because resolving them requires app state (the active
 * ride / route plan) rather than a static path. Since these schemes are also
 * registered as app schemes, Expo Router's own linking otherwise tries to
 * resolve the pathless URL, matches it to the index route, and resets the stack
 * back to the planner — clobbering our manual navigation (and popping the active
 * ride modal). Returning `null` tells Expo Router to skip navigation and stay on
 * the current path, leaving these URLs entirely to our handler.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    const scheme = path.toLowerCase()
    if (scheme.startsWith("widget://") || scheme.startsWith("liveactivity://")) {
      return null
    }
  } catch {
    // Never throw from here — it can crash the app on launch. Fall through to
    // the default behavior on any unexpected input.
  }

  return path || null
}
