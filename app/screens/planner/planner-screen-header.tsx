import { useEffect, useState } from "react"
import { Image, ImageStyle, Platform, TouchableOpacity, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/core"
import { observer } from "mobx-react-lite"
import * as storage from "../../utils/storage"
import analytics from "@react-native-firebase/analytics"
import { color, fontScale, spacing } from "../../theme"
import { Chip, Text } from "../../components"
import { useStores } from "../../models"
import { isRTL } from "../../i18n"

const HEADER_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
}

let headerIconSize = 25
if (fontScale > 1.15) headerIconSize = 30

const SETTINGS_ICON_IMAGE: ImageStyle = {
  width: headerIconSize,
  height: headerIconSize,
  marginStart: spacing[3],
  tintColor: color.primary,
  opacity: 0.7,
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
const SETTINGS_ICON = require("../../../assets/settings.png")

export const PlannerScreenHeader = observer(function PlannerScreenHeader() {
  const { routePlan, ride } = useStores()
  const navigation = useNavigation()
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  useEffect(() => {
    // display the "new" badge on ios devices if the user has stations selected (it's not the
    // initial launch) and they haven't seen the live announcement screen yet
    if (routePlan.origin && routePlan.destination && Platform.OS === "ios") {
      storage.load("seenLiveAnnouncement").then((hasSeenLiveAnnouncementScreen) => {
        if (!hasSeenLiveAnnouncementScreen) setDisplayNewBadge(true)
      })
    }
  }, [])

  return (
    <View style={HEADER_WRAPPER}>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {ride.route && (
          <Chip
            color="success"
            onPress={() => {
              // @ts-expect-error
              navigation.navigate("activeRideStack", {
                screen: "activeRide",
                params: { routeItem: ride.route, originId: ride.originId, destinationId: ride.destinationId },
              })

              analytics().logEvent("open_live_ride_modal_pressed")
            }}
          >
            <Image source={TRAIN_ICON} style={LIVE_BUTTON_IMAGE} />
            <Text style={{ color: "white", fontWeight: "500" }} tx="ride.live" />
          </Chip>
        )}

        {displayNewBadge && (
          <Chip color="primary" onPress={() => navigation.navigate("liveAnnouncementStack")}>
            <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
            <Text style={{ color: "white", fontWeight: "500" }} tx="common.new" />
          </Chip>
        )}
      </View>
      <TouchableOpacity onPress={() => navigation.navigate("settingsStack")} activeOpacity={0.8} accessibilityLabel="הגדרות">
        <Image source={SETTINGS_ICON} style={SETTINGS_ICON_IMAGE} />
      </TouchableOpacity>
    </View>
  )
})
