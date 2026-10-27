import { getVersion } from "react-native-device-info"

/** Themes (Tel Aviv, classic) ship with v3. An OTA update can reach an older binary, which keeps the classic look. */
export function isAccentThemeSupported(): boolean {
  return Number(getVersion().split(".")[0]) >= 3
}
