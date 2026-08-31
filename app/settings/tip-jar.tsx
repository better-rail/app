import { Redirect } from "expo-router"
import { Platform } from "react-native"
import { TipJarScreen } from "@/screens/settings/settings-tip-jar-screen"

export default function TipJarRoute() {
  if (Platform.OS !== "ios") return <Redirect href="/settings" />

  return <TipJarScreen />
}
