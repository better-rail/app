import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { Image, View, ViewStyle, ImageStyle, Platform, ScrollView, ActivityIndicator, TextStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../../components"
import { userLocale } from "../../../i18n"
import { useStores } from "../../../models"
import { Announcement } from "../../../services/api"
// import { getAnnouncements } from "../../../services/api/announcements-api"
import { spacing, color, fontScale } from "../../../theme"
import { openLink } from "../../../utils/helpers/open-link"

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

// const SEPARATOR_STYLE: ViewStyle = {
//   backgroundColor: color.separator,
//   height: 1,
//   width: "100%",
//   marginVertical: spacing[4],
// }

export const NoTrainsFoundMessage = observer(function NoTrainsFoundMessage() {
  // const [relatedAnnouncements, setRelatedAnnouncements] = useState<Announcement[]>([])

  // const { routePlan } = useStores()

  // useEffect(() => {
  //   const originId = routePlan.origin.id
  //   const destinationId = routePlan.destination.id

  //   async function findRelatedAnnouncements() {
  //     const announcements = await getAnnouncements()

  //     // Related updates to the route
  //     const related = announcements.filter(
  //       (announce) =>
  //         announce.station.includes(originId) || announce.station.includes(destinationId) || announce.station.length === 0,
  //     )

  //     setRelatedAnnouncements(related)
  //   }

  //   findRelatedAnnouncements()
  // }, [])

  return (
    <ScrollView contentContainerStyle={CONTAINER}>
      <Image style={SEARCH_ICON} source={require("../../../../assets/search.png")} />
      <Text tx="routes.noTrainsFound" style={NO_TRAINS_FOUND_TEXT} />

      {/* <View style={SEPARATOR_STYLE} />
      <View style={{ width: "100%", marginBottom: spacing[4], flexDirection: "row", alignItems: "center" }}>
        <Image
          style={{ width: 20, height: 20, marginEnd: spacing[2], tintColor: color.text }}
          source={require("../../../../assets/info.png")}
        />
        <Text tx="routes.updates" style={{ fontWeight: "500" }} />
      </View>

      {/* {relatedAnnouncements.length > 0 ? (
        relatedAnnouncements.map((a) => <AnnouncementCard announcement={a} key={a.order} />)
      ) : (
        <ActivityIndicator style={{ marginTop: spacing[5] }} size="large" />
      )} */}
    </ScrollView>
  )
})

// const ANNOUNCEMENT_CARD: ViewStyle = {
//   maxWidth: "100%",
//   minWidth: "100%",
//   minHeight: 80 * fontScale,
//   backgroundColor: color.inputBackground,
//   marginBottom: spacing[4],
//   paddingTop: spacing[4],
//   paddingBottom: spacing[2],
//   paddingStart: spacing[3],
//   paddingEnd: spacing[4],
//   borderRadius: Platform.select({ ios: 12, android: 8 }),
//   shadowColor: color.palette.black,
//   shadowOffset: { height: 0, width: 0 },
//   shadowOpacity: 0.05,
//   elevation: 1,
//   flexDirection: "row",
// }

// function AnnouncementCard({ announcement }: { announcement: Announcement }) {
//   let title = announcement.nameHeb
//   let link = announcement.updateLinkHeb

//   if (userLocale === "ar") {
//     title = announcement.nameArb
//     link = announcement.updateLinkArb
//   }
//   if (userLocale === "en") {
//     title = announcement.nameEng
//     link = announcement.updateLinkEng
//   }
//   if (userLocale === "ru") {
//     title = announcement.nameRus
//     link = announcement.updateLinkRus
//   }

//   return (
//     <TouchableScale activeScale={0.95} friction={9} onPress={() => openLink(link)}>
//       <View style={ANNOUNCEMENT_CARD}>
//         <Text>{title}</Text>
//       </View>
//     </TouchableScale>
//   )
// }
