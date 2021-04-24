import { Linking, Alert, StatusBar } from "react-native"
import { InAppBrowser } from "react-native-inappbrowser-reborn"

export const openLink = async function openLink(url: string) {
  try {
    const oldStyle = StatusBar.pushStackEntry({ barStyle: "default" })

    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, {
        // iOS Properties
        dismissButtonStyle: "done",
        readerMode: false,
        animated: true,
        modalPresentationStyle: "automatic",
        modalEnabled: true,
        enableBarCollapsing: false,
        // Android Properties
        // showTitle: true,
        // toolbarColor: "#6200EE",
        // secondaryToolbarColor: "black",
        // enableUrlBarHiding: true,
        // enableDefaultShare: true,
        // forceCloseOnRedirection: false,
        // Specify full animation resource identifier(package:anim/name)
        // or only resource name(in case of animation bundled with app).
        animations: {
          startEnter: "slide_in_right",
          startExit: "slide_out_left",
          endEnter: "slide_in_left",
          endExit: "slide_out_right",
        },
      })
      StatusBar.popStackEntry(oldStyle)
    } else Linking.openURL(url)
  } catch (error) {
    console.error(error)
    Alert.alert("שגיאה", "לא ניתן לפתוח את הלינק")
  }
}
