import { useCallback, useEffect } from "react"
import { useRouter, useNavigation, type Href } from "expo-router"
import { acquireNavigationLock, releaseNavigationLock, getActiveNavigationToken } from "@/utils/navigation-lock"

/**
 * Drop-in replacement for expo-router's `useRouter` that serializes navigation
 * through a single app-wide lock (see {@link acquireNavigationLock}).
 *
 * Rapid taps across the planner and station-selection screens can otherwise
 * dispatch overlapping navigations that crash Android's Fabric renderer while it
 * mounts/unmounts the outgoing screen. Holding the shared lock until the screen
 * transition finishes removes the app-side trigger for that race without
 * changing the navigation users see.
 */
export function useGuardedNavigation() {
  const router = useRouter()
  const navigation = useNavigation()

  // Release the shared lock when the native screen transition finishes — the
  // real signal that the previous navigation's mount batch has completed.
  //
  // The release is correlated with the navigation that acquired the lock: we
  // capture the active token at `transitionStart` and release exactly that
  // token at `transitionEnd`. A late `transitionEnd` from a navigation that has
  // already been superseded therefore carries a stale token and is ignored, so
  // it cannot unlock a newer navigation. The ceiling timer in navigation-lock
  // is only a safety net for transitions that never emit these events.
  useEffect(() => {
    let transitionToken: number | null = null
    const onStart = () => {
      transitionToken = getActiveNavigationToken()
    }
    const onEnd = () => {
      if (transitionToken !== null) {
        releaseNavigationLock(transitionToken)
        transitionToken = null
      }
    }
    // @ts-expect-error - transitionStart/End are stack-navigator specific
    const unsubscribeStart = navigation.addListener("transitionStart", onStart)
    // @ts-expect-error - transitionStart/End are stack-navigator specific
    const unsubscribeEnd = navigation.addListener("transitionEnd", onEnd)
    return () => {
      unsubscribeStart()
      unsubscribeEnd()
    }
  }, [navigation])

  const push = useCallback(
    (href: Href) => {
      if (!acquireNavigationLock()) return
      router.push(href)
    },
    [router],
  )

  const back = useCallback(() => {
    // Check reachability *before* taking the lock so a no-op back can never
    // leave the lock held (which would block every later navigation).
    if (!router.canGoBack()) return
    if (!acquireNavigationLock()) return
    router.back()
  }, [router])

  return { push, back }
}
