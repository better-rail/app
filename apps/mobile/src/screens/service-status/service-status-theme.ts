import { useIsDarkMode } from "@/hooks"
import type { ServiceStatusLevel } from "@/services/api"
import { parseHex } from "@/components/rail-map/rail-map-theme"
import type { StationStatusKind } from "./station-status"

/**
 * Status colours as plain strings (they also feed Skia and reanimated, which
 * cannot consume PlatformColor — see route-details/components/use-route-colors.tsx).
 * These are for fills: dots, bands and tints. Text in a level's colour takes its ink below.
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

/**
 * The same colours as text: the light ones are darkened until small text in them reads at 4.5:1 on
 * the light backgrounds (the fills are too pale for that); the dark ones already do on the dark.
 */
export const STATUS_LEVEL_INKS: Record<ServiceStatusLevel, { light: string; dark: string }> = {
  goodService: { light: "#1B7F3A", dark: STATUS_LEVEL_COLORS.goodService.dark },
  minorDelays: { light: "#9C6300", dark: STATUS_LEVEL_COLORS.minorDelays.dark },
  severeDelays: { light: "#C8362B", dark: STATUS_LEVEL_COLORS.severeDelays.dark },
  partSuspended: { light: STATUS_LEVEL_COLORS.partSuspended.light, dark: STATUS_LEVEL_COLORS.partSuspended.dark },
  suspended: { light: STATUS_LEVEL_COLORS.suspended.light, dark: STATUS_LEVEL_COLORS.suspended.dark },
  noService: { light: "#6E6E73", dark: STATUS_LEVEL_COLORS.noService.dark },
  unknown: { light: "#6E6E73", dark: STATUS_LEVEL_COLORS.unknown.dark },
}

export function useStatusLevelColor(level: ServiceStatusLevel): string {
  const isDark = useIsDarkMode()
  return STATUS_LEVEL_COLORS[level][isDark ? "dark" : "light"]
}

/** The level's colour for text, readable on the screen's backgrounds. */
export function useStatusLevelInk(level: ServiceStatusLevel): string {
  const isDark = useIsDarkMode()
  return STATUS_LEVEL_INKS[level][isDark ? "dark" : "light"]
}

/** Text colour that reads on a line's badge/band colour. */
export const contrastText = (hex: string): string => {
  const [r, g, b] = parseHex(hex).map((channel) => channel / 255)
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

/** The station card's colours as text (see STATUS_LEVEL_INKS). */
export const STATION_KIND_INKS: Record<StationStatusKind, { light: string; dark: string }> = {
  good: STATUS_LEVEL_INKS.goodService,
  delays: STATUS_LEVEL_INKS.minorDelays,
  cancellations: STATUS_LEVEL_INKS.severeDelays,
  planned: STATION_KIND_COLORS.planned,
  noService: STATUS_LEVEL_INKS.noService,
  closed: STATUS_LEVEL_INKS.noService,
  unknown: STATUS_LEVEL_INKS.unknown,
}

export function useStationKindColor(kind: StationStatusKind | undefined): string {
  const isDark = useIsDarkMode()
  return STATION_KIND_COLORS[kind ?? "unknown"][isDark ? "dark" : "light"]
}

export function useStationKindInk(kind: StationStatusKind | undefined): string {
  const isDark = useIsDarkMode()
  return STATION_KIND_INKS[kind ?? "unknown"][isDark ? "dark" : "light"]
}

/** A colour as a translucent wash behind text in that colour (two hex digits of alpha appended). */
export const tinted = (hex: string, alpha = 0.16): string =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
