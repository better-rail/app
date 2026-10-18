// Marks route lists opened from outside the app: widgets, home screen shortcuts and website links.
export const DEEP_LINK_PARAM = "deepLink"

type NavigatorState = {
  index?: number
  routes: readonly { name: string; params?: object; state?: NavigatorState }[]
}

const focusedIndex = (state: NavigatorState) => state.index ?? state.routes.length - 1

// Follows the focused screens down from the root, since expo-router nests the app's layouts under its own navigator.
// Returns nothing when a modal (settings, active ride, etc.) covers the main stack.
function findFocusedMainStack(state: NavigatorState | undefined): NavigatorState | undefined {
  const route = state?.routes[focusedIndex(state)]
  if (!route) return undefined
  return route.name === "(main)" ? route.state : findFocusedMainStack(route.state)
}

/**
 * Counts the screens a previous deep link left on the main stack: its route list and everything above it.
 */
export function countDeepLinkedScreens(rootState: NavigatorState | undefined) {
  const mainStack = findFocusedMainStack(rootState)
  if (!mainStack) return 0

  const activeIndex = focusedIndex(mainStack)
  const deepLinkIndex = mainStack.routes.findIndex(
    (route) => route.name === "route-list" && (route.params as Record<string, unknown>)?.[DEEP_LINK_PARAM] === "true",
  )
  if (deepLinkIndex === -1 || deepLinkIndex > activeIndex) return 0

  return activeIndex - deepLinkIndex + 1
}
