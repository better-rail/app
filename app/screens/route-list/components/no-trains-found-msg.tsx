import { observer } from "mobx-react-lite"
import React from "react"
import { Image, ViewStyle, ImageStyle, ScrollView, TextStyle } from "react-native"
import { Text } from "../../../components"
import { useStores } from "../../../models"
import { spacing, color } from "../../../theme"
import { AnnouncementsList } from "../../../components/announcements/announcements-list"
import { AnnouncementsHeader } from "../../../components/announcements/announcements-header"

const CONTAINER: ViewStyle = {
  alignItems: "center",
  paddingBottom: 250,
  paddingHorizontal: spacing[4],
}

const SEARCH_ICON: ImageStyle = {
  width: 57.5,
  height: 57.5,
  marginBottom: spacing[2],
  opacity: 0.7,
  tintColor: color.text,
}

const NO_TRAINS_FOUND_TEXT: TextStyle = {
  marginBottom: spacing[2],
  textAlign: "center",
}

export const NoTrainsFoundMessage = observer(function NoTrainsFoundMessage() {
  const { routePlan } = useStores()
  const originId = routePlan.origin.id
  const destinationId = routePlan.destination.id

  const shouldShowAnnouncements = originId !== destinationId

  return (
    <ScrollView contentContainerStyle={CONTAINER}>
      <Image style={SEARCH_ICON} source={require("../../../../assets/search.png")} />
      <Text tx={shouldShowAnnouncements ? "routes.noTrainsFound" : "routes.sameStationsMessage"} style={NO_TRAINS_FOUND_TEXT} />

      {shouldShowAnnouncements && (
        <>
          <AnnouncementsHeader separator="top" />
          <AnnouncementsList updatesType="regular" relevantStationIds={[originId, destinationId]} />
        </>
      )}
    </ScrollView>
  )
})
