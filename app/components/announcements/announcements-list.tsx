import React from "react"
import { ActivityIndicator } from "react-native"
import { useQuery } from "react-query"
import { userLocale } from "../../i18n"
import { Announcement, PopUpMessage, railApi } from "../../services/api"
import { spacing } from "../../theme"
import { AnnouncementCard } from "./announcement-card"

type AnnouncementsListProps = {
  updatesType: "regular" | "urgent"
  relevantStationIds?: string[]
  hideLoader?: boolean
}

export const AnnouncementsList: React.FC<AnnouncementsListProps> = ({ updatesType, relevantStationIds, hideLoader }) => {
  const { isLoading, data: announcements } = useQuery<Announcement[] | PopUpMessage[]>(
    ["announcements", updatesType, relevantStationIds],
    () => {
      return updatesType === "regular"
        ? railApi.getAnnouncements(userLocale, relevantStationIds)
        : railApi.getPopupMessages(userLocale)
    },
  )

  if (isLoading) {
    if (hideLoader) {
      return <></>
    }

    return <ActivityIndicator style={{ marginTop: spacing[5] }} size="large" />
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
