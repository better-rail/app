import {
  acquireNavigationLock,
  releaseNavigationLock,
  getActiveNavigationToken,
  isNavigationLocked,
  resetNavigationLock,
  NAV_SETTLE_CEILING_MS,
} from "./navigation-lock"

/**
 * Regression coverage for BETTER-RAIL-37: rapid navigation across the planner
 * and station-selection screens crashed Android's Fabric renderer
 * ("addViewAt: failed to insert view") because overlapping navigations mounted
 * on top of an in-flight transition. The lock must dispatch exactly one
 * navigation per transition, must never wedge, and must never let a stale
 * release from a superseded navigation unlock a newer one.
 *
 * A real native Fabric crash can't be reproduced in Jest; these tests assert the
 * JS-side invariants that remove its trigger.
 */
describe("navigation lock", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetNavigationLock()
  })

  afterEach(() => {
    resetNavigationLock()
    jest.useRealTimers()
  })

  it("blocks overlapping navigations during the reported rapid sequence", () => {
    // Origin push, then destination push, then destination-again — all before
    // the first transition finishes.
    expect(acquireNavigationLock()).toBe(true) // select origin
    expect(acquireNavigationLock()).toBe(false) // select destination (in flight)
    expect(acquireNavigationLock()).toBe(false) // change destination again
    expect(isNavigationLocked()).toBe(true)
  })

  it("allows the next navigation once its transition finishes (transitionEnd)", () => {
    expect(acquireNavigationLock()).toBe(true)
    const token = getActiveNavigationToken()!
    releaseNavigationLock(token) // transitionEnd for this navigation
    expect(isNavigationLocked()).toBe(false)
    expect(acquireNavigationLock()).toBe(true) // next screen is reachable
  })

  it("never wedges: auto-releases via the ceiling if no transitionEnd arrives", () => {
    expect(acquireNavigationLock()).toBe(true)
    expect(acquireNavigationLock()).toBe(false)

    jest.advanceTimersByTime(NAV_SETTLE_CEILING_MS)

    expect(isNavigationLocked()).toBe(false)
    expect(acquireNavigationLock()).toBe(true)
  })

  it("does not release early before the ceiling elapses", () => {
    expect(acquireNavigationLock()).toBe(true)

    jest.advanceTimersByTime(NAV_SETTLE_CEILING_MS - 1)

    expect(isNavigationLocked()).toBe(true)
    expect(acquireNavigationLock()).toBe(false)
  })

  it("ignores a late release from a superseded navigation (ownership token)", () => {
    // Navigation A acquires, then its transition overruns the ceiling.
    expect(acquireNavigationLock()).toBe(true)
    const tokenA = getActiveNavigationToken()!
    jest.advanceTimersByTime(NAV_SETTLE_CEILING_MS) // A's ceiling releases A
    expect(isNavigationLocked()).toBe(false)

    // Navigation B now acquires the freed lock.
    expect(acquireNavigationLock()).toBe(true)
    expect(getActiveNavigationToken()).not.toBe(tokenA)

    // A's delayed transitionEnd finally fires, carrying A's stale token. It must
    // NOT release B's lock.
    releaseNavigationLock(tokenA)
    expect(isNavigationLocked()).toBe(true)

    // B's own transitionEnd still releases correctly.
    releaseNavigationLock(getActiveNavigationToken()!)
    expect(isNavigationLocked()).toBe(false)
  })
})
