/**
 * Colours for the schematic map. Plain hex strings on purpose: Skia paints
 * cannot consume PlatformColor / DynamicColorIOS values (same constraint as
 * screens/route-details/components/use-route-colors.tsx), so the map keeps
 * its own light/dark pairs and picks one with the current colour scheme.
 *
 * The map is drawn on a solid ground, unlike the textured original it is
 * modelled on: a deep navy in dark mode, the app's off-white in light mode.
 */
export type RailMapPalette = {
  /** Solid ground. */
  background: string
  /** Labels. */
  ink: string
  /** Station dots (dark in both schemes, as on the original). */
  dot: string
  /** Lines and labels that are not the selected line. */
  dimLine: string
  dimInk: string
  /** Disruption badge on affected stations ("!" on a disc). */
  badge: string
  badgeInk: string
}

export const RAIL_MAP_PALETTE: Record<"light" | "dark", RailMapPalette> = {
  light: {
    background: "#F6F6F8",
    ink: "#1D1D1F",
    dot: "#1D1D1F",
    dimLine: "#D2D3D9",
    dimInk: "#A2A4AD",
    badge: "#1D1D1F",
    badgeInk: "#FFFFFF",
  },
  dark: {
    background: "#0F1524",
    ink: "#F2F2F7",
    dot: "#14171F",
    dimLine: "#343A4A",
    dimInk: "#767C8C",
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
