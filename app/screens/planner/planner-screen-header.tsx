import { Image, ImageStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { Chip, Text } from "../../components"
import { useStores } from "../../models"
import { isRTL } from "../../i18n"
import { useNavigation } from "@react-navigation/core"
import { useState } from "react"
import analytics from "@react-native-firebase/analytics"

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

export function PlannerScreenHeader() {
  const { ride } = useStores()
  const navigation = useNavigation()
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  return (
    <View style={HEADER_WRAPPER}>
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
        <Chip color="primary" onPress={() => navigation.navigate("widgetOnboardingStack")}>
          <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
          <Text style={{ color: "white", fontWeight: "500" }} tx="common.new" />
        </Chip>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("settingsStack")} activeOpacity={0.8} accessibilityLabel="הגדרות">
        <Image source={SETTINGS_ICON} style={SETTINGS_ICON_IMAGE} />
      </TouchableOpacity>
    </View>
  )
}
