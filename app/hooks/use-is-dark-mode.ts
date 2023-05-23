import { useColorScheme } from "react-native"

export function useIsDarkMode() {
  const colorScheme = useColorScheme()
  return colorScheme === "dark"
}
