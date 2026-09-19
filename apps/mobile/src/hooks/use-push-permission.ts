import { useEffect, useState } from "react"
import { Alert, Linking } from "react-native"
import { translate, type TxKeyPath } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import { type AlertsPermission, getPushPermission, requestPushPermission } from "@/utils/push-subscription-sync"
import { useAppState } from "./use-app-state"

/**
 * The notification permission, re-read whenever the app comes to the foreground (it can change in
 * the device settings while the app is away), and `ensure`: ask for it when it is not granted,
 * pointing at the settings when it was refused. Shared by everything that subscribes to pushes.
 */
export function usePushPermission() {
  const appState = useAppState()
  const [permission, setPermission] = useState<AlertsPermission>()

  useEffect(() => {
    if (appState === "active") getPushPermission().then(setPermission)
  }, [appState])

  /** Resolves whether notifications are allowed, after asking if need be. `source` names the asker in analytics. */
  const ensure = async (source: string, denied: { title: TxKeyPath; message: TxKeyPath }): Promise<boolean> => {
    let granted = permission
    if (granted !== "granted") {
      granted = await requestPushPermission()
      setPermission(granted)
      if (granted === "granted") trackEvent("notification_permission_granted", { source })
    }
    if (granted === "granted") return true
    Alert.alert(translate(denied.title) ?? "", translate(denied.message) ?? "", [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      { text: translate("stationAlerts.openSettings") ?? "", onPress: () => Linking.openSettings() },
    ])
    return false
  }

  return { permission, ensure }
}
