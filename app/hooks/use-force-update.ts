import { getVersion } from "react-native-device-info"
import { useFeatureFlagWithPayload } from "posthog-react-native"

function isVersionBelow(current: string, minimum: string): boolean {
  const currentParts = current.split(".").map(Number)
  const minimumParts = minimum.split(".").map(Number)
  for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
    const c = currentParts[i] ?? 0
    const m = minimumParts[i] ?? 0
    if (c < m) return true
    if (c > m) return false
  }
  return false
}

export function useForceUpdate() {
  const [_, minVersion] = useFeatureFlagWithPayload("force-app-update")
  const currentVersion = getVersion()

  if (typeof minVersion !== "string" || !minVersion) {
    return { isUpdateRequired: false }
  }

  return {
    isUpdateRequired: isVersionBelow(currentVersion, minVersion),
  }
}
