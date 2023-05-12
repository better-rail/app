import { useMemo } from "react"
import { useColorScheme } from "react-native"

/**
 * The station / line state
 */
export type RouteElementStateType = "idle" | "inProgress" | "passed"

export const ROUTE_LINE_STATE_COLORS = {
  idle: { light: "#3C3C434A", dark: "#54545899" },
  passed: { light: "#5CAB61", dark: "#475A42" },
  inProgress: { light: "#FF9500FF", dark: "#E08A00" },
}

export const ROUTE_STOP_CIRCLE_COLORS = {
  passed: { light: "#B0E1A5", dark: "#698661" },
  inProgress: { light: "#F5AF00", dark: "#F5AF00" },
  idle: { light: "#f2f2f7", dark: "#1c1c1e" },
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

  return useMemo(() => {
    if (element === "line") {
      return ROUTE_LINE_STATE_COLORS[state][colorScheme]
    }

    return ROUTE_STOP_CIRCLE_COLORS[state][colorScheme]
  }, [state])
}
