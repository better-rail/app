/**
 * Colours for the schematic map. Plain hex strings on purpose: Skia paints
 * cannot consume PlatformColor / DynamicColorIOS values (same constraint as
 * screens/route-details/components/use-route-colors.tsx), so the map keeps
 * its own light/dark pairs and picks one with the current colour scheme.
 */
export type RailMapPalette = {
  /** Solid ground. */
  background: string
  /** Station names. */
  ink: string
  /** The ring of a station capsule and the ticks beside lone lines. */
  marker: string
  /** The fill of a station capsule. */
  markerFill: string
  /** Lines, names and markers that are not the selected line's. */
  dimLine: string
  dimInk: string
  /** The frames around the big cities and their names. */
  frame: string
  cityInk: string
  /** Disruption badge on affected stations ("!" on a disc). */
  badge: string
  badgeInk: string
  /** The halo around the selected station. */
  selection: string
}

export const RAIL_MAP_PALETTE: Record<"light" | "dark", RailMapPalette> = {
  light: {
    background: "#FFFFFF",
    ink: "#1D1F26",
    marker: "#1D1F26",
    markerFill: "#FFFFFF",
    dimLine: "#E1E2E6",
    dimInk: "#B9BBC3",
    frame: "#B4B6BE",
    cityInk: "#6E717C",
    badge: "#1D1D1F",
    badgeInk: "#FFFFFF",
    selection: "#0A7AFF",
  },
  dark: {
    background: "#0E1220",
    ink: "#F2F2F7",
    marker: "#F2F2F7",
    markerFill: "#0E1220",
    dimLine: "#2C3242",
    dimInk: "#5A6070",
    frame: "#4C5468",
    cityInk: "#A9AEBD",
    badge: "#F2F2F7",
    badgeInk: "#0E1220",
    selection: "#5CA8FF",
  },
}

/** The three 0–255 channels of a "#rgb" or "#rrggbb" colour. */
export const parseHex = (h: string): number[] => {
  const clean = h.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

/** Mixes a hex colour towards the map background: the "pale" rendering of a suspended stretch. */
export const paleColor = (hex: string, background: string, amount = 0.6): string => {
  const [r1, g1, b1] = parseHex(hex)
  const [r2, g2, b2] = parseHex(background)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount)
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`
}
