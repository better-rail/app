import { useColorScheme } from "react-native"
import type { ServiceStatusLevel } from "@/services/api"
import type { StationStatusKind } from "./station-status"

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

/** The station card's colours: green, orange, red, a colour of its own for planned works, and grey. */
export const STATION_KIND_COLORS: Record<StationStatusKind, { light: string; dark: string }> = {
  good: STATUS_LEVEL_COLORS.goodService,
  delays: STATUS_LEVEL_COLORS.minorDelays,
  cancellations: STATUS_LEVEL_COLORS.severeDelays,
  planned: { light: "#3F51B5", dark: "#8C9EFF" },
  noService: STATUS_LEVEL_COLORS.noService,
  closed: STATUS_LEVEL_COLORS.noService,
  unknown: STATUS_LEVEL_COLORS.unknown,
}

export function useStationKindColor(kind: StationStatusKind): string {
  const isDark = useColorScheme() === "dark"
  return STATION_KIND_COLORS[kind][isDark ? "dark" : "light"]
}

/** A colour as a translucent wash behind text in that colour (two hex digits of alpha appended). */
export const tinted = (hex: string, alpha = 0.16): string =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
