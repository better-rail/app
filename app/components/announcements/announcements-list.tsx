import React from "react"
import { ActivityIndicator, Image, TextStyle, View, ViewStyle } from "react-native"
import { useQuery } from "react-query"
import { userLocale } from "../../i18n"
import { Announcement, PopUpMessage, railApi } from "../../services/api"
import { color, spacing } from "../../theme"
import { AnnouncementCard } from "./announcement-card"
import { Text } from "../text/text"
import { Button } from "../button/button"

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

  // if (isLoading) {
  //   if (hideLoader) {
  //     return <></>
  //   }

  //   return <ActivityIndicator style={{ marginTop: spacing[5] }} size="large" />
  // }

  if (true) {
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
      <Image source={require("../../../assets/info.png")} style={{ marginBottom: spacing[0], tintColor: color.error }} />
      <Text style={ERORR_MESSAGE_TEXT}>Bad News</Text>
      <Text style={{ textAlign: "center", marginBottom: spacing[3] }}>
        There was an error loading updates from Israel Railways.
      </Text>

      <Button onPress={() => refetch()} title="Retry" containerStyle={{ width: 200 }} />
    </View>
  )
}
