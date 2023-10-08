import React from "react"
import { Platform, View } from "react-native"
import { useQuery } from "react-query"
import { userLocale } from "../../i18n"
import { PopUpMessage, railApi } from "../../services/api"
import { spacing } from "../../theme"
import { Text } from "../text/text"
import { Screen } from "../screen/screen"
import { useIsDarkMode } from "../../hooks"
import { AnnouncementCard } from "./announcement-card"
import { removeHtmlTagsAndEntities } from "./announcements-utils"

export const UrgentAnnouncements = () => {
  const isDarkMode = useIsDarkMode()
  const { data: messages } = useQuery<PopUpMessage[]>(["announcements", "urgent"], () => railApi.getPopupMessages(userLocale))

  return (
    <Screen unsafe statusBar={Platform.select({ ios: "light-content" })} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}>
      <Text style={{ fontSize: 48, textAlign: "center", marginVertical: spacing[4] }}>📣</Text>
      <View style={{ paddingHorizontal: spacing[4] }}>
        {messages?.map((m, i) => (
          <AnnouncementCard body={m.messageBody} key={i} />
        ))}
      </View>
    </Screen>
  )
}
