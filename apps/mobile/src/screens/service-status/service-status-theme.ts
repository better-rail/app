import { useColorScheme } from "react-native"
import type { ServiceStatusLevel } from "@/services/api"

/**
 * Status colours as plain strings (they also feed Skia and reanimated, which
 * cannot consume PlatformColor — see route-details/components/use-route-colors.tsx).
 */
export const STATUS_LEVEL_COLORS: Record<ServiceStatusLevel, { light: string; dark: string }> = {
  goodService: { light: "#2E9E4F", dark: "#4CD964" },
  minorDelays: { light: "#D48A00", dark: "#FFB020" },
  severeDelays: { light: "#D93A2F", dark: "#FF5A4F" },
  partSuspended: { light: "#C2185B", dark: "#FF6B9A" },
  suspended: { light: "#7B1FA2", dark: "#C77DFF" },
  noService: { light: "#8E8E93", dark: "#98989F" },
  unknown: { light: "#8E8E93", dark: "#98989F" },
}

export function useStatusLevelColor(level: ServiceStatusLevel): string {
  const isDark = useColorScheme() === "dark"
  return STATUS_LEVEL_COLORS[level][isDark ? "dark" : "light"]
}

/** Text colour that reads on a line's badge/band colour. */
export const contrastText = (hex: string): string => {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.6 ? "#1D1D1F" : "#FFFFFF"
}
