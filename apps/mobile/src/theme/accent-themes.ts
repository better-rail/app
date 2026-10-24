import type { TxKeyPath } from "@/i18n"
import type { AppTheme, ThemeFont, ThemeSkin, ThemeTimeFont } from "./themes"

export const cityThemeIds = ["telAviv", "jerusalem", "haifa", "beerSheva"] as const
export const specialThemeIds = ["neon", "pixel", "newspaper", "retro"] as const

export type AccentThemeId = "default" | (typeof cityThemeIds)[number] | (typeof specialThemeIds)[number]

export const accentThemeIds: AccentThemeId[] = ["default", ...cityThemeIds, ...specialThemeIds]

export const isAccentThemeId = (value: unknown): value is AccentThemeId => accentThemeIds.includes(value as AccentThemeId)

export type AccentColors = Pick<
  AppTheme["colors"],
  "primary" | "primaryLighter" | "primaryDarker" | "secondary" | "secondaryLighter" | "link"
>

type SurfaceKey =
  | "background"
  | "secondaryBackground"
  | "tertiaryBackground"
  | "modalBackground"
  | "inputBackground"
  | "inputPlaceholderBackground"
  | "text"
  | "label"
  | "placeholder"
  | "separator"
  | "dim"
  | "dimmer"

interface ThemeAppearance {
  accents: Record<keyof AccentColors, string>
  surfaces: Record<SurfaceKey, string>
  skin?: ThemeSkin
}

interface ThemeDefinition {
  light: ThemeAppearance
  dark: ThemeAppearance
  /** A font riders can switch the route times to */
  alternateTimeFont?: { font: ThemeTimeFont; label: TxKeyPath }
  /** Always on, in both appearances */
  headingFont?: ThemeFont
  subheadingFont?: ThemeFont
  stopNameFont?: ThemeFont
  labelFont?: ThemeFont
  buttonFont?: ThemeFont
}

/** Pages share one color, cards and inputs another */
const surfaces = (
  page: string,
  card: string,
  raised: string,
  field: string,
  text: string,
  label: string,
  placeholder: string,
  separator: string,
  dim: string,
): Record<SurfaceKey, string> => ({
  background: page,
  secondaryBackground: card,
  tertiaryBackground: raised,
  modalBackground: page,
  inputBackground: card,
  inputPlaceholderBackground: field,
  text,
  label,
  placeholder,
  separator,
  dim,
  dimmer: field,
})

// The night LED board: black with glowing cyan and magenta times
const ledBoard: ThemeSkin["routeCard"] = {
  background: "#0A0612",
  border: "rgba(255, 79, 176, 0.6)",
  borderWidth: 1,
  radius: 12,
  shadow: "0 0 10px rgba(255, 46, 160, 0.45)",
  text: "#F3E8FF",
  label: "#9C88BD",
  departureTime: "#38E1FF",
  arrivalTime: "#FF4FB0",
  timeGlow: true,
}

// The daytime LED board: a white card with a pink neon edge and darker, unglowing times
const ledBoardLight: ThemeSkin["routeCard"] = {
  background: "#FFFFFF",
  border: "rgba(209, 18, 122, 0.45)",
  borderWidth: 1,
  radius: 12,
  shadow: "0 0 10px rgba(209, 18, 122, 0.25)",
  text: "#24103A",
  label: "#6E5A8C",
  departureTime: "#0784A0",
  arrivalTime: "#C2127A",
}

// A 16-bit game dialog box: white pixel frame and a hard square shadow
const dialogBox: ThemeSkin["routeCard"] = {
  background: "#1F2A8F",
  border: "#FFFFFF",
  borderWidth: 3,
  radius: 3,
  shadow: "4px 4px 0 rgba(0, 0, 0, 0.75)",
  text: "#FFFFFF",
  label: "#B9C2FF",
  departureTime: "#FFFFFF",
  arrivalTime: "#FFD84A",
}

// A split-flap departure board in 70s browns
const flapBoard: ThemeSkin["routeCard"] = {
  background: "#2A1F17",
  border: "#4A3626",
  borderWidth: 1,
  radius: 8,
  shadow: "0 2px 0 rgba(0, 0, 0, 0.35)",
  text: "#F6E7C8",
  label: "#BFA27A",
  departureTime: "#F2B33D",
  arrivalTime: "#F6E7C8",
}

const themes: Record<Exclude<AccentThemeId, "default">, ThemeDefinition> = {
  // The White City: Bauhaus paper and ink, ultramarine and red, lettered in Fontef's Tel Aviv Brutalist and Modernist
  telAviv: {
    headingFont: { family: "TelAvivBrutalist", scale: 0.85 },
    subheadingFont: { family: "TelAvivBrutalist", scale: 0.85 },
    stopNameFont: { family: "TelAvivBrutalistRegular", scale: 0.85 },
    labelFont: { family: "TelAvivModernistRegular" },
    buttonFont: { family: "TelAvivModernistRegular" },
    alternateTimeFont: {
      font: { family: "TelAvivBrutalistRegular", size: 24, compact: true },
      label: "settings.timeFontBrutalist",
    },
    light: {
      accents: {
        primary: "#1F3FA6",
        primaryLighter: "#5D78D1",
        primaryDarker: "#162F7D",
        secondary: "#E2442F",
        secondaryLighter: "#E6EAF5",
        link: "#1F3FA6",
      },
      surfaces: surfaces("#F3F1EC", "#FFFFFF", "#F3F1EC", "#E4E1D9", "#111111", "#55534E", "#A3A099", "#DEDBD3", "#77746D"),
    },
    dark: {
      accents: {
        primary: "#3A5BD9",
        primaryLighter: "#7F95E8",
        primaryDarker: "#2A45B0",
        secondary: "#D23B27",
        secondaryLighter: "#232A42",
        link: "#8EA4FF",
      },
      surfaces: surfaces("#161512", "#22201C", "#2A2823", "#33302A", "#F3F1EC", "#B3AFA6", "#747068", "#38352E", "#A39F96"),
    },
  },
  // Jerusalem stone gold and pomegranate
  jerusalem: {
    light: {
      accents: {
        primary: "#94650F",
        primaryLighter: "#C99A45",
        primaryDarker: "#6E4A0A",
        secondary: "#B3202E",
        secondaryLighter: "#F8E3E1",
        link: "#94650F",
      },
      surfaces: surfaces("#F4EEE2", "#FFFCF5", "#F4EEE2", "#E9E0CE", "#2A2117", "#6E5F48", "#B0A28A", "#E6DCC8", "#8A7960"),
    },
    dark: {
      accents: {
        primary: "#A8741A",
        primaryLighter: "#D3A55A",
        primaryDarker: "#855A10",
        secondary: "#C2303D",
        secondaryLighter: "#3D2422",
        link: "#E0B56A",
      },
      surfaces: surfaces("#1B1712", "#27211A", "#2F281F", "#383027", "#F6EFE2", "#BCAA8E", "#7D6E58", "#3B3228", "#A9977C"),
    },
  },
  // The bay's teal and Carmel green
  haifa: {
    light: {
      accents: {
        primary: "#0B8793",
        primaryLighter: "#4DB6BF",
        primaryDarker: "#086A73",
        secondary: "#3E7B3A",
        secondaryLighter: "#E3F0E0",
        link: "#0B8793",
      },
      surfaces: surfaces("#EEF5F5", "#FFFFFF", "#EEF5F5", "#DCEBEC", "#0F2A2D", "#4A6B6E", "#9AB3B5", "#D3E4E5", "#6F8C8F"),
    },
    dark: {
      accents: {
        primary: "#1C96A2",
        primaryLighter: "#5CC4CD",
        primaryDarker: "#147680",
        secondary: "#3F8A3A",
        secondaryLighter: "#22352A",
        link: "#5CC4CD",
      },
      surfaces: surfaces("#0F1E21", "#17292D", "#1D3237", "#23393E", "#EAF6F7", "#93B3B6", "#5F7E82", "#28424A", "#87A4A8"),
    },
  },
  // Desert terracotta and sand
  beerSheva: {
    light: {
      accents: {
        primary: "#BF5130",
        primaryLighter: "#E08A6B",
        primaryDarker: "#963C21",
        secondary: "#B9823F",
        secondaryLighter: "#F6EBDC",
        link: "#BF5130",
      },
      surfaces: surfaces("#F6EFE6", "#FFFDF9", "#F6EFE6", "#EADFCE", "#2E2117", "#725C48", "#B8A48E", "#E6DACA", "#8F7864"),
    },
    dark: {
      accents: {
        primary: "#D9673F",
        primaryLighter: "#EE9774",
        primaryDarker: "#B5502D",
        secondary: "#A06F36",
        secondaryLighter: "#4A3D2F",
        link: "#EE8862",
      },
      surfaces: surfaces("#1C1611", "#282019", "#30271F", "#3A2F25", "#F7EEE4", "#BBA48D", "#7E6A57", "#3D3228", "#AB9580"),
    },
  },
  // Pastel vaporwave by day, purple-black by night
  neon: {
    alternateTimeFont: { font: { family: "Doto", size: 25, letterSpacing: -0.5, compact: true }, label: "settings.timeFontLed" },
    light: {
      accents: {
        primary: "#D1127A",
        primaryLighter: "#EE5FAE",
        primaryDarker: "#A50D60",
        secondary: "#0892B0",
        secondaryLighter: "#DDF6FB",
        link: "#D1127A",
      },
      surfaces: surfaces("#F7EEFF", "#FFFFFF", "#F7EEFF", "#EEDDFB", "#24103A", "#6E5A8C", "#A894C4", "#E6D4F7", "#8E7AAD"),
      // On the light page the cyan darkens to stay readable, and only glows at night
      skin: { routeCard: ledBoardLight, stationTime: { color: "#0784A0" } },
    },
    dark: {
      accents: {
        primary: "#E0248C",
        primaryLighter: "#F27BBE",
        primaryDarker: "#B51A72",
        secondary: "#0A8FAD",
        secondaryLighter: "#173A42",
        link: "#FF5CB8",
      },
      surfaces: surfaces("#140B24", "#1E1233", "#251740", "#2C1C4A", "#F6ECFF", "#B8A3D9", "#7F6A9F", "#3A2659", "#A38FC4"),
      skin: { routeCard: ledBoard, stationTime: { color: "#38E1FF", glow: "#38E1FF" } },
    },
  },
  // A 16-bit game: royal purple, coin gold and game-over red
  pixel: {
    alternateTimeFont: { font: { family: "Micro5", size: 38 }, label: "settings.timeFontPixel" },
    light: {
      accents: {
        primary: "#5A2FD6",
        primaryLighter: "#8F6FF0",
        primaryDarker: "#4220A8",
        secondary: "#D8322B",
        secondaryLighter: "#FBE2E0",
        link: "#5A2FD6",
      },
      surfaces: surfaces("#EDEBFA", "#FFFFFF", "#EDEBFA", "#DDD9F5", "#1A1640", "#57508A", "#A6A1CF", "#DCD8F2", "#7570A6"),
      skin: { routeCard: dialogBox, stationTime: { color: "#5A2FD6" } },
    },
    dark: {
      accents: {
        primary: "#6E48F0",
        primaryLighter: "#A08BFF",
        primaryDarker: "#5233C8",
        secondary: "#D8322B",
        secondaryLighter: "#3E2030",
        link: "#A08BFF",
      },
      surfaces: surfaces("#0E0D26", "#191838", "#201F45", "#28264F", "#F0EEFF", "#ABA6DA", "#6D68A3", "#2C2A55", "#9D98CF"),
      skin: { routeCard: dialogBox, stationTime: { color: "#FFD84A" } },
    },
  },
  // Newsprint and black ink with a red headline; the night edition leads with the red
  newspaper: {
    alternateTimeFont: { font: { family: "FrankRuhlLibre", size: 23 }, label: "settings.timeFontPrint" },
    light: {
      accents: {
        primary: "#111111",
        primaryLighter: "#555555",
        primaryDarker: "#000000",
        secondary: "#C62D23",
        secondaryLighter: "#F7E1DE",
        link: "#C62D23",
      },
      surfaces: surfaces("#EFEBE1", "#FAF8F2", "#EFEBE1", "#E3DED1", "#111111", "#5A554A", "#A39E90", "#D9D3C4", "#77715F"),
      skin: {
        routeCard: {
          background: "#FAF8F2",
          border: "#111111",
          borderWidth: 1.5,
          radius: 0,
          shadow: "0 0 0 transparent",
          text: "#111111",
          label: "#5A554A",
          departureTime: "#111111",
          arrivalTime: "#C62D23",
        },
      },
    },
    dark: {
      accents: {
        primary: "#C62D23",
        primaryLighter: "#E2665D",
        primaryDarker: "#9E2019",
        secondary: "#5C5850",
        secondaryLighter: "#2C2A26",
        link: "#F08A82",
      },
      surfaces: surfaces("#141414", "#1E1E1C", "#262624", "#2E2E2B", "#EDE8DC", "#ABA699", "#6E6A60", "#33322E", "#9C978A"),
      skin: {
        routeCard: {
          background: "#1E1E1C",
          border: "#EDE8DC",
          borderWidth: 1.5,
          radius: 0,
          shadow: "0 0 0 transparent",
          text: "#EDE8DC",
          label: "#ABA699",
          departureTime: "#EDE8DC",
          arrivalTime: "#F08A82",
        },
      },
    },
  },
  // 70s Israel Railways: burnt orange, mustard and brown
  retro: {
    alternateTimeFont: { font: { family: "BebasNeue", size: 29, letterSpacing: 0.5 }, label: "settings.timeFontBoard" },
    light: {
      accents: {
        primary: "#9C5418",
        primaryLighter: "#CF8A4C",
        primaryDarker: "#7A400F",
        secondary: "#A86F0C",
        secondaryLighter: "#F6E8C9",
        link: "#9C5418",
      },
      surfaces: surfaces("#F5ECD8", "#FFF9EC", "#F5ECD8", "#EADDBF", "#2B1D10", "#755C3E", "#BBA27E", "#E6D7B7", "#8F7350"),
      skin: { routeCard: flapBoard, stationTime: { color: "#9C5418" } },
    },
    dark: {
      accents: {
        primary: "#B4621F",
        primaryLighter: "#E0954F",
        primaryDarker: "#8E4B14",
        secondary: "#9E6A0E",
        secondaryLighter: "#3A2C16",
        link: "#F2B33D",
      },
      surfaces: surfaces("#1C130B", "#281C11", "#312317", "#3A2A1B", "#F7EBD6", "#C2A783", "#806A4E", "#3E2E1E", "#B09774"),
      skin: { routeCard: flapBoard, stationTime: { color: "#F2B33D" } },
    },
  },
}

export const getThemeDefinition = (id: AccentThemeId) => (id === "default" ? undefined : themes[id])

/** The theme's accent colors in each appearance; the default keeps the system colors */
export const getAccentPalette = (id: AccentThemeId) => {
  const theme = getThemeDefinition(id)
  return theme && { light: theme.light.accents, dark: theme.dark.accents }
}

export const getAlternateTimeFont = (id: AccentThemeId) => getThemeDefinition(id)?.alternateTimeFont
