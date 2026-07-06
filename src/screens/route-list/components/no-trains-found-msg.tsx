import React from "react"
import { Image, ScrollView } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore } from "@/models"
import { AnnouncementsList } from "@/components/announcements/announcements-list"
import { AnnouncementsHeader } from "@/components/announcements/announcements-header"

export function NoTrainsFoundMessage() {
  const { origin, destination } = useRoutePlanStore(
    useShallow((s) => ({ origin: s.origin, destination: s.destination }))
  )
  const originId = origin.id
  const destinationId = destination.id

  const shouldShowAnnouncements = originId !== destinationId

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image style={styles.searchIcon} source={require("../../../../assets/search.png")} />
      <Text tx={shouldShowAnnouncements ? "routes.noTrainsFound" : "routes.sameStationsMessage"} style={styles.noTrainsFoundText} />

      {shouldShowAnnouncements && (
        <>
          <AnnouncementsHeader separator="top" />
          <AnnouncementsList updatesType="regular" relevantStationIds={[originId, destinationId]} />
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    paddingBottom: 250,
    paddingHorizontal: theme.spacing[4],
  },
  searchIcon: {
    width: 57.5,
    height: 57.5,
    marginBottom: theme.spacing[2],
    opacity: 0.7,
    tintColor: theme.colors.text,
  },
  noTrainsFoundText: {
    marginBottom: theme.spacing[2],
    textAlign: "center",
  },
}))
