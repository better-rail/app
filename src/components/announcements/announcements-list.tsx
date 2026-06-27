import React from "react"
import { ActivityIndicator, Button, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useQuery } from "react-query"
import { translate, userLocale } from "@/i18n"
import { Announcement, PopUpMessage, railApi } from "@/services/api"
import { AnnouncementCard } from "./announcement-card"
import { Text } from "@/components/text/text"

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

    return <ActivityIndicator style={styles.loader} size="large" />
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

function ErrorMessage({ refetch }) {
  return (
    <View style={styles.errorMessageWrapper}>
      <Image source={require("../../../assets/info.png")} style={styles.errorIcon} />
      <Text tx="common.error" style={styles.errorMessageText} />
      <Text tx="routes.updatesError" style={styles.errorDescription} />
      <Button onPress={() => refetch()} title={translate("common.tryAgain")} />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  loader: {
    marginTop: theme.spacing[5],
  },
  errorMessageWrapper: {
    paddingHorizontal: theme.spacing[3],
    alignItems: "center",
  },
  errorMessageText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: theme.spacing[1],
  },
  errorIcon: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing[0],
    tintColor: theme.colors.error,
  },
  errorDescription: {
    textAlign: "center",
    marginBottom: theme.spacing[2],
  },
}))
