import { Alert, Platform } from "react-native"
import * as Burnt from "burnt"

// On Android burnt shows nothing at all, so errors went unnoticed — use a real alert there. iOS keeps burnt's HUD.
export function showErrorAlert(options: { title: string | null; message?: string | null }) {
  const title = options.title ?? ""
  const message = options.message ?? undefined

  if (Platform.OS === "android") {
    Alert.alert(title, message)
    return
  }

  Burnt.alert({ title, message, preset: "error", duration: 3 })
}
