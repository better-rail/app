export type MobilePlatform = "ios" | "android"

/**
 * The mobile OS the browser is running on, or `null` for anything without an app store to send people to
 * (desktop, and anything we cannot identify). Client-only: on the server there is no user agent to read, so
 * callers must resolve it after mount rather than during render.
 */
export function detectMobilePlatform(): MobilePlatform | null {
  if (typeof navigator === "undefined") return null
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return "android"
  // iPadOS 13+ sends a desktop Safari user agent, so a touch-capable "Mac" is really an iPad.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios"
  return null
}
