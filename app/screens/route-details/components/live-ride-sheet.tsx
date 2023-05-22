import { useMemo } from "react"
import { Pressable, PressableProps, View, ViewStyle, Image, useColorScheme, ActivityIndicator } from "react-native"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color } from "../../../theme"
import { Text } from "../../../components"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { translate } from "../../../i18n"
import analytics from "@react-native-firebase/analytics"

const SHEET_CONTAINER: ViewStyle = {
  height: 75,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  position: "absolute",
  width: "100%",
  borderTopColor: color.separator,
  borderTopWidth: 1,
}
// TODO: add typings to progress
export const LiveRideSheet = observer(function LiveRideSheet(props: { progress; screenName: "routeDetails" | "activeRide" }) {
  const { ride } = useStores()
  const { progress, screenName } = props

  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const { status, minutesLeft } = progress

  const progressText = useMemo(() => {
    if (!ride.id) return translate("ride.activatingRide")
    if (status === "inTransit" && minutesLeft < 2) {
      return translate("ride.trainArriving")
    } else if (status === "inTransit") {
      return translate("ride.arrivingIn", { minutes: minutesLeft })
    } else if (status === "arrived") {
      return translate("ride.arrived")
    } else if ((status === "waitForTrain" || status === "inExchange") && minutesLeft < 1) {
      return translate("ride.departsNow")
    }

    return translate("ride.departsIn", { minutes: minutesLeft })
  }, [minutesLeft, status, ride.id])

  return (
    <View
      style={{
        ...SHEET_CONTAINER,
        height: insets.bottom > 0 ? insets.bottom + 60 : 75,
        paddingBottom: insets.bottom > 0 ? 25 : 0,
        bottom: 0,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", color: color.success }}>{progressText}</Text>

      <StopButton
        loading={!ride.id}
        onPress={() => {
          ride.stopRide(ride.id)
          analytics().logEvent("stop_live_ride")

          if (screenName === "activeRide") {
            navigation.goBack()
          }
        }}
      />
      <BlurView
        style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }}
        blurType={isDarkMode ? "ultraThinMaterialDark" : "xlight"}
        blurAmount={30}
        reducedTransparencyFallbackColor={color.tertiaryBackground as unknown as string}
      />
    </View>
  )
})

const StopButton = (props: { loading: boolean } & PressableProps) => (
  <Pressable
    style={({ pressed }) => [
      {
        width: 42.5,
        height: 42.5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color.stop,
        borderRadius: 30,
      },
    ]}
    {...props}
  >
    {props.loading ? (
      <ActivityIndicator color="white" />
    ) : (
      <Image source={require("../../../../assets/stop-rect.ios.png")} style={{ width: 17.5, height: 17.5 }} />
    )}
  </Pressable>
)
