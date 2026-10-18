// Marks route lists opened from outside the app: widgets, home screen shortcuts and website links.
export const DEEP_LINK_PARAM = "deepLink"

type NavigatorState = {
  key?: string
  index?: number
  routes: readonly { name: string; params?: object; state?: NavigatorState }[]
}

const focusedIndex = (state: NavigatorState) => state.index ?? state.routes.length - 1

// Follows the focused screens down to the navigator that holds the main stack and the modals presented over it.
// expo-router nests the app's layouts under its own root navigator, so it isn't the top level.
function findMainParent(state: NavigatorState | undefined): NavigatorState | undefined {
  if (!state) return undefined
  if (state.routes.some((route) => route.name === "(main)")) return state
  return findMainParent(state.routes[focusedIndex(state)]?.state)
}

/**
 * Finds what to dismiss before opening a deep-linked route list:
 * - `modals`: screens covering the main stack (active ride, settings, etc.), so the route list
 *   opens in the existing main stack rather than in a new one with no way back.
 * - `deepLinkedScreens`: the route list a previous deep link opened, and everything above it.
 */
export function getDeepLinkDismissals(rootState: NavigatorState | undefined) {
  const parent = findMainParent(rootState)
  if (!parent?.key) return undefined

  const mainIndex = parent.routes.findIndex((route) => route.name === "(main)")
  const mainStack = parent.routes[mainIndex].state
  const modals = Math.max(focusedIndex(parent) - mainIndex, 0)

  let deepLinkedScreens = 0
  if (mainStack) {
    const activeIndex = focusedIndex(mainStack)
    const deepLinkIndex = mainStack.routes.findIndex(
      (route) => route.name === "route-list" && (route.params as Record<string, unknown>)?.[DEEP_LINK_PARAM] === "true",
    )
    if (deepLinkIndex !== -1 && deepLinkIndex <= activeIndex) deepLinkedScreens = activeIndex - deepLinkIndex + 1
  }

  return { parentKey: parent.key, modals, deepLinkedScreens }
}
