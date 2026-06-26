import { Platform } from "react-native"
import { SupportUsScreen as SupportUsScreenIOS } from "./support-us-announcement-screen.ios"
import { SupportUsScreen as SupportUsScreenAndroid } from "./support-us-announcement-screen.android"

export const SupportUsScreen = Platform.select({
  ios: SupportUsScreenIOS,
  android: SupportUsScreenAndroid,
})
