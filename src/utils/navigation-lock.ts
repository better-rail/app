/**
 * A single, app-wide navigation lock.
 *
 * Rapid navigation (e.g. quickly selecting an origin, then a destination, then
 * changing it again) can dispatch overlapping navigations. On Android's Fabric
 * renderer the overlapping mount batches race and crash with
 * "addViewAt: failed to insert view [x] into parent [y]" /
 * "The specified child already has a parent" — a view scheduled for removal in
 * one batch is re-inserted by the next before the removal executes.
 *
 * This module serializes navigation: once a navigation is dispatched the lock is
 * held until its transition (and therefore its native mount batch) settles, so a
 * second navigation cannot be dispatched into the middle of the first one.
 *
 * The lock is a module-level singleton on purpose — expo-router drives a single
 * navigator, so every screen and control shares one lock rather than each
 * component holding its own. Guarding only some controls leaves the race open,
 * so all navigation entry points route through {@link acquireNavigationLock}.
 *
 * ## Ownership tokens
 *
 * Because this workaround targets *delayed* native/UI work, a release signal can
 * arrive late — after its navigation was already superseded. Each acquisition
 * therefore owns a monotonic token, and {@link releaseNavigationLock} only frees
 * the lock when the token matches the one currently held. A stale ceiling timer
 * or a late `transitionEnd` from a previous navigation carries an old token and
 * is ignored, so it can never unlock a newer navigation.
 */

/** Upper bound the lock is held for if no `transitionEnd` signal arrives. */
export const NAV_SETTLE_CEILING_MS = 700

let locked = false
let activeToken = 0
let ceilingTimer: ReturnType<typeof setTimeout> | null = null

function clearCeiling() {
  if (ceilingTimer !== null) {
    clearTimeout(ceilingTimer)
    ceilingTimer = null
  }
}

/**
 * Attempt to start a navigation. Returns `true` and holds the lock when the
 * caller may navigate; returns `false` when a navigation is already in flight
 * and the caller should do nothing.
 */
export function acquireNavigationLock(): boolean {
  if (locked) return false
  locked = true
  activeToken += 1
  const token = activeToken
  clearCeiling()
  // Safety net: if the transition's `transitionEnd` never arrives, release this
  // token (and only this token) so the lock can never wedge.
  ceilingTimer = setTimeout(() => releaseNavigationLock(token), NAV_SETTLE_CEILING_MS)
  return true
}

/** The token of the navigation currently holding the lock, or `null` if free. */
export function getActiveNavigationToken(): number | null {
  return locked ? activeToken : null
}

/**
 * Release the lock for a specific navigation. No-op unless `token` matches the
 * navigation that currently holds the lock, so a late/stale release from an
 * earlier navigation cannot free a newer one.
 */
export function releaseNavigationLock(token: number) {
  if (!locked || token !== activeToken) return
  clearCeiling()
  locked = false
}

export function isNavigationLocked(): boolean {
  return locked
}

/** Test-only: force the lock back to its initial state between test cases. */
export function resetNavigationLock() {
  clearCeiling()
  locked = false
  activeToken = 0
}
