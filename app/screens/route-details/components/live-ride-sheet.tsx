import { useMemo } from "react"
import { Pressable, PressableProps, View, ViewStyle, Image, useColorScheme } from "react-native"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color } from "../../../theme"
import { Text } from "../../../components"
import { Ride } from "../../../models/ride/ride"
import { useNavigation } from "@react-navigation/native"

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
export function LiveRideSheet(props: { progress; ride: Ride; screenName: "routeDetails" | "activeRide" }) {
  const { progress, ride, screenName } = props

  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const { status, minutesLeft } = progress

  const progressText = useMemo(() => {
    if (status === "inTransit" && minutesLeft < 2) {
      return `Train arrives to destination`
    } else if (status === "inTransit") {
      return `Arriving in ${minutesLeft} min`
    } else if (status === "arrived") {
      return "You have arrived"
    } else if ((status === "waitForTrain" || status === "inExchange") && minutesLeft < 1) {
      return `Train departs now`
    }

    return `Train departs in ${minutesLeft} min`
  }, [minutesLeft, status])

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
        onPress={() => {
          ride.stopRide(ride.id)

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
}

const StopButton = (props: PressableProps) => (
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
    <Image source={require("../../../../assets/stop-rect.ios.png")} style={{ width: 17.5, height: 17.5 }} />
  </Pressable>
)
