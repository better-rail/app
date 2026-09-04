import { Platform } from "react-native"

import { ActivityAnnouncementScreen as ActivityAnnouncementScreenIOS } from "./activity-announcement-screen.ios"
import { ActivityAnnouncementScreen as ActivityAnnouncementScreenAndroid } from "./activity-announcement-screen.android"

export const ActivityAnnouncementScreen = Platform.select({
  ios: ActivityAnnouncementScreenIOS,
  android: ActivityAnnouncementScreenAndroid,
})
