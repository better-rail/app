import React from "react"
import { ActivityIndicator, Button, Image, TextStyle, View, ViewStyle } from "react-native"
import { useQuery } from "react-query"
import { translate, userLocale } from "../../i18n"
import { Announcement, PopUpMessage, railApi } from "../../services/api"
import { color, spacing } from "../../theme"
import { AnnouncementCard } from "./announcement-card"
import { Text } from "../text/text"

type AnnouncementsListProps = {
  updatesType: "regular" | "urgent"
  relevantStationIds?: string[]
  hideLoader?: boolean
}

export const AnnouncementsList: React.FC<AnnouncementsListProps> = ({ updatesType, relevantStationIds, hideLoader }) => {
  const {
    isLoading,
    data: announcements,
    isError,
    refetch,
  } = useQuery<Announcement[] | PopUpMessage[]>(["announcements", updatesType, relevantStationIds], () => {
    return updatesType === "regular"
      ? railApi.getAnnouncements(userLocale, relevantStationIds)
      : railApi.getPopupMessages(userLocale)
  })

  if (isLoading) {
    if (hideLoader) {
      return <></>
    }

    return <ActivityIndicator style={{ marginTop: spacing[5] }} size="large" />
  }

  if (isError) {
    return <ErrorMessage refetch={refetch} />
  }

  return (
    <>
      {announcements.map((announcement, index) => {
        if (updatesType === "regular") {
          const a: Announcement = announcement
          return <AnnouncementCard key={index} title={a.updateHeader} body={a.updateContent} link={a.updateLink} />
        } else {
          const a: PopUpMessage = announcement
          return <AnnouncementCard key={index} title={a.title} body={a.messageBody} />
        }
      })}
    </>
  )
}

const ERORR_MESSAGE_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3],
  alignItems: "center",
}

const ERORR_MESSAGE_TEXT: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: spacing[1],
}

function ErrorMessage({ refetch }) {
  return (
    <View style={ERORR_MESSAGE_WRAPPER}>
      <Image
        source={require("../../../assets/info.png")}
        style={{ width: 80, height: 80, marginBottom: spacing[0], tintColor: color.error }}
      />
      <Text tx="common.error" style={ERORR_MESSAGE_TEXT} />
      <Text tx="routes.updatesError" style={{ textAlign: "center", marginBottom: spacing[2] }} />
      <Button onPress={() => refetch()} title={translate("common.tryAgain")} />
    </View>
  )
}
