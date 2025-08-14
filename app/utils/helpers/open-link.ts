import { Linking, StatusBar } from "react-native"
import * as WebBrowser from "expo-web-browser"

export const openLink = async function openLink(url: string) {
  try {
    const oldStyle = StatusBar.pushStackEntry({ barStyle: "default" })

    const result = await WebBrowser.openBrowserAsync(url, {
      // iOS Properties
      dismissButtonStyle: "done",
      readerMode: false,
      // Android Properties
      // showTitle: true,
      // toolbarColor: "#6200EE",
      // secondaryToolbarColor: "black",
      // enableUrlBarHiding: true,
      // enableDefaultShare: true,
      // forceCloseOnRedirection: false,
    })

    StatusBar.popStackEntry(oldStyle)

    if (result.type === "cancel") {
      // User cancelled, fallback to external browser
      Linking.openURL(url)
    }
  } catch (error) {
    console.error(error)
    // Fallback to external browser
    Linking.openURL(url)
  }
}
