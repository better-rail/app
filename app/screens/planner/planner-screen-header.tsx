import { useEffect, useState } from "react"
import { Image, ImageStyle, Platform, TouchableOpacity, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/core"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootParamList } from "../../navigators"
import * as storage from "../../utils/storage"
import { trackEvent } from "../../services/analytics"
import { color, fontScale, spacing } from "../../theme"
import { Chip, Text } from "../../components"
import { useStores } from "../../models"
import { isRTL, translate, userLocale } from "../../i18n"
import { ImportantAnnouncementBar } from "./Important-announcement-bar"
import { railApi } from "../../services/api"
import { useQuery } from "react-query"
import { head, isEmpty } from "lodash"

const HEADER_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
}

let headerIconSize = 25
if (fontScale > 1.15) headerIconSize = 30

const HEADER_ICON_IMAGE: ImageStyle = {
  width: headerIconSize,
  height: headerIconSize,
  marginStart: spacing[3],
  tintColor: color.primary,
  opacity: 0.7,
  transform: isRTL ? [{ rotateY: "180deg" }] : undefined,
}

const LIVE_BUTTON_IMAGE: ImageStyle = {
  width: 22.5,
  height: 14,
  marginEnd: isRTL ? spacing[1] : spacing[2],
  tintColor: "white",
  transform: isRTL ? [{ rotateY: "220deg" }] : undefined,
}

const TRAIN_ICON = require("../../../assets/train.ios.png")
const SPARKLES_ICON = require("../../../assets/sparkles.png")
const UPDATES_ICON = require("../../../assets/updates.png")
const SETTINGS_ICON = require("../../../assets/settings.png")

type NavigationProps = StackNavigationProp<RootParamList, "mainStack">

export function PlannerScreenHeader() {
  const { routePlan, ride, settings } = useStores()
  const navigation = useNavigation<NavigationProps>()
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  const { data: popupMessages } = useQuery(["announcements", "urgent"], () => {
    return railApi.getPopupMessages(userLocale)
  })

  // Filter unseen urgent messages from the popup messages
  const unseenUrgentMessages = popupMessages ? settings.filterUnseenUrgentMessages(popupMessages) : []
  const showUrgentBar = !isEmpty(unseenUrgentMessages)

  useEffect(() => {
    // display the "new" badge if the user has stations selected (not the initial launch),
    // and they haven't seen the live announcement screen yet,
    // and the user can run live activities (iOS only)
    if (routePlan.origin && routePlan.destination) {
      if (Platform.OS === "android" || ride.canRunLiveActivities) {
        storage.load("seenLiveAnnouncement").then((hasSeenLiveAnnouncementScreen) => {
          if (!hasSeenLiveAnnouncementScreen) setDisplayNewBadge(true)
        })
      }
    }
  }, [])

  const openAnnouncements = () => {
    navigation.navigate("announcementsStack")
    trackEvent("announcements_icon_pressed")
  }

  const openSettings = () => {
    navigation.navigate("settingsStack")
    trackEvent("settings_icon_pressed")
  }

  return (
    <>
      <View style={HEADER_WRAPPER}>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          {ride.route && (
            <Chip
              variant="success"
              onPress={() => {
                // @ts-expect-error
                navigation.navigate("activeRideStack", {
                  screen: "activeRide",
                  params: { routeItem: ride.route, originId: ride.originId(), destinationId: ride.destinationId() },
                })

                trackEvent("open_live_ride_modal_pressed")
              }}
            >
              {Platform.OS === "ios" && <Image source={TRAIN_ICON} style={LIVE_BUTTON_IMAGE} />}
              <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="ride.live" />
            </Chip>
          )}

          {displayNewBadge && !showUrgentBar && (
            <Chip variant="primary" onPress={() => navigation.navigate("liveAnnouncementStack")}>
              <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
              <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="common.new" />
            </Chip>
          )}
        </View>
        <TouchableOpacity onPress={openAnnouncements} activeOpacity={0.8} accessibilityLabel={translate("routes.updates")}>
          <Image source={UPDATES_ICON} style={[HEADER_ICON_IMAGE]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openSettings} activeOpacity={0.8} accessibilityLabel={translate("settings.title")}>
          <Image source={SETTINGS_ICON} style={HEADER_ICON_IMAGE} />
        </TouchableOpacity>
      </View>

      {showUrgentBar && !ride.route && (
        <View style={{ position: "absolute", top: 0, left: 16 }}>
          <ImportantAnnouncementBar title={head(popupMessages)?.messageBody} />
        </View>
      )}
    </>
  )
}
