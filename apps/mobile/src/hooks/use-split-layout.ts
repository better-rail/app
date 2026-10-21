import { Platform, useWindowDimensions } from "react-native"

/** Wide iOS windows, like an unfolded iPhone Duo, show the planner in a sidebar beside the route list. */
export function useSplitLayout() {
  const { width } = useWindowDimensions()
  return Platform.OS === "ios" && width >= 768
}
