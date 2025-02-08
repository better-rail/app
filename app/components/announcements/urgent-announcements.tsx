import { useEffect, useState } from "react"
import { Platform, View } from "react-native"
import { useQuery } from "react-query"
import { uniqBy } from "lodash"
import { userLocale } from "../../i18n"
import { PopUpMessage, railApi } from "../../services/api"
import { spacing } from "../../theme"
import { Screen, Text } from ".."
import { useIsDarkMode } from "../../hooks"
import { useStores } from "../../models"
import { AnnouncementCard } from "./announcement-card"

export const UrgentAnnouncements = () => {
  const { settings } = useStores()
  const isDarkMode = useIsDarkMode()

  const { data: messages } = useQuery(["announcements", "urgent"], () => railApi.getPopupMessages(userLocale))
  const [unseenUrgentMessages, setUnseenUrgentMessages] = useState<PopUpMessage[]>([])

  useEffect(() => {
    if (messages) {
      const unseenUrgentMessages = settings.filterUnseenUrgentMessages(messages)
      setUnseenUrgentMessages(unseenUrgentMessages)

      if (unseenUrgentMessages.length > 0) {
        // Delay to avoid hiding the urgent announcement bar while the modal is opening.
        // For some reason, the timeout also prevents the rerender of planner screen header.
        setTimeout(() => {
          settings.setSeenUrgentMessagesIds(unseenUrgentMessages.map((message) => message.id))
        }, 1000)
      }
    }
  }, [messages])

  return (
    <Screen unsafe statusBar={Platform.select({ ios: "light-content" })} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}>
      <Text style={{ fontSize: 48, textAlign: "center", marginVertical: spacing[4] }}>📣</Text>
      <View style={{ paddingHorizontal: spacing[4] }}>
        {/* we use uniqBy to avoid duplicate messages, as the API usually returns the same message twice */}
        {uniqBy(unseenUrgentMessages, "title").map((message) => (
          <AnnouncementCard body={message.messageBody} key={message.id} />
        ))}
      </View>
    </Screen>
  )
}
