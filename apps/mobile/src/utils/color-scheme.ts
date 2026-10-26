import { getVersion } from "react-native-device-info"

/** The light/dark appearance setting ships with v3. An OTA update can reach an older binary, which keeps following the system. */
export function isColorSchemeSettingSupported(): boolean {
  return Number(getVersion().split(".")[0]) >= 3
}
