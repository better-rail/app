import { getVersion } from "react-native-device-info"

export function isHourIndexSupported(): boolean {
  return Number(getVersion().split(".")[0]) >= 3
}
