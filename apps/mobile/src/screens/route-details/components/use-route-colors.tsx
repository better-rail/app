import { useColorScheme } from "react-native"
import { useUnistyles } from "react-native-unistyles"

/**
 * The station / line state
 */
export type RouteElementStateType = "idle" | "inProgress" | "passed" | "hidden"

export const ROUTE_LINE_STATE_COLORS = {
  idle: { light: "#3C3C434A", dark: "#54545899" },
  passed: { light: "#5CAB61", dark: "#475A42" },
  inProgress: { light: "#FF9500FF", dark: "#E08A00" },
  hidden: { light: "transparent", dark: "transparent" },
}

export const ROUTE_STOP_CIRCLE_COLORS = {
  passed: { light: "#B0E1A5", dark: "#698661" },
  inProgress: { light: "#F5AF00", dark: "#F5AF00" },
  idle: { light: "#f2f2f7", dark: "#1c1c1e" },
  hidden: { light: "transparent", dark: "transparent" },
}

/**
 * Get the route border / circle colors according to the provided state.
 *
 * The resason why we have this hook instead of using the colors in the `color.ts` file, is that
 * we are using the color values in reanimated color interpolation method,
 * which can't consume an ColorOpaqueValue,
 */
export function useRouteColors(state: RouteElementStateType, element: "line" | "circle") {
  const colorScheme = useColorScheme()
  const { theme } = useUnistyles()
  const { primary, background } = theme.colors

  // Themes with their own colors (hex strings) tint the idle line and match the dots to the page;
  // passed and in-progress keep their ride status colors
  if (state === "idle" && theme.hasOwnColors && typeof primary === "string" && typeof background === "string") {
    return element === "line" ? `${primary}73` : background
  }

  if (element === "line") {
    return ROUTE_LINE_STATE_COLORS[state][colorScheme]
  }

  return ROUTE_STOP_CIRCLE_COLORS[state][colorScheme]
}
