import { Platform } from "react-native"
import { LiveAnnouncementScreen as LiveAnnouncementScreenAndroid } from "./live-announcement-screen.android"
import { LiveAnnouncementScreen as LiveAnnouncementScreenIOS } from "./live-announcement-screen.ios"

export const LiveAnnouncementScreen = Platform.select({
  ios: LiveAnnouncementScreenIOS,
  android: LiveAnnouncementScreenAndroid,
})
