/**
 * Colours for the schematic map. Plain hex strings on purpose: Skia paints
 * cannot consume PlatformColor / DynamicColorIOS values (same constraint as
 * screens/route-details/components/use-route-colors.tsx), so the map keeps
 * its own light/dark pairs and picks one with the current colour scheme.
 *
 * The map is drawn on a solid ground, without the original's sea gradient:
 * white in light mode (the original's colours as they are), a deep navy in
 * dark mode.
 */
export type RailMapPalette = {
  /** Solid ground. */
  background: string
  /** Station names. */
  ink: string
  /** Station dots and the hollow circles of stops trains may pass (dark in both schemes, as on the original). */
  dot: string
  /** Lines and labels that are not the selected line. */
  dimLine: string
  dimInk: string
  /** The rounded frames around the big cities and their names. */
  frame: string
  cityInk: string
  /** The sea: its colour away from the coast, near the coast, and the shoreline ribbon; the lakes. */
  seaFar: string
  seaNear: string
  shore: string
  lake: string
  /** Disruption badge on affected stations ("!" on a disc). */
  badge: string
  badgeInk: string
}

export const RAIL_MAP_PALETTE: Record<"light" | "dark", RailMapPalette> = {
  light: {
    background: "#FFFFFF",
    ink: "#2B2E37",
    dot: "#120900",
    dimLine: "#DCDDE2",
    dimInk: "#B5B7BF",
    frame: "#B4B6BE",
    cityInk: "#4A4D56",
    seaFar: "#CEEDFF",
    seaNear: "#E6F5FF",
    shore: "#C3E9FF",
    lake: "#CEEDFF",
    badge: "#1D1D1F",
    badgeInk: "#FFFFFF",
  },
  dark: {
    background: "#0F1524",
    ink: "#F2F2F7",
    dot: "#14171F",
    dimLine: "#343A4A",
    dimInk: "#5E6474",
    frame: "#4C5468",
    cityInk: "#C9CCD6",
    seaFar: "#17233C",
    seaNear: "#121B2F",
    shore: "#1F3050",
    lake: "#17233C",
    badge: "#F2F2F7",
    badgeInk: "#0F1524",
  },
}

/** Mixes a hex colour towards the map background: the "pale" rendering of a suspended stretch. */
export const paleColor = (hex: string, background: string, amount = 0.6): string => {
  const parse = (h: string) => {
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
  const [r1, g1, b1] = parse(hex)
  const [r2, g2, b2] = parse(background)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount)
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`
}
