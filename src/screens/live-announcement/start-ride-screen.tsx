import { Platform } from "react-native"
import { StartRideAnnouncement as StartRideAnnouncementAndroid } from "./start-ride-announcement-screen.android"
import { StartRideAnnouncement as StartRideAnnouncementIOS } from "./start-ride-announcement-screen.ios"

export const StartRideAnnouncement = Platform.select({
  ios: StartRideAnnouncementIOS,
  android: StartRideAnnouncementAndroid,
})
