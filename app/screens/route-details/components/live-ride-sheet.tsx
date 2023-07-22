import { useMemo } from "react"
import { Pressable, PressableProps, Image, ActivityIndicator } from "react-native"
import { color } from "../../../theme"
import { Text, BottomScreenSheet } from "../../../components"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { translate } from "../../../i18n"
import analytics from "@react-native-firebase/analytics"

// TODO: add typings to progress
export const LiveRideSheet = observer(function LiveRideSheet(props: { progress; screenName: "routeDetails" | "activeRide" }) {
  const { ride } = useStores()
  const { progress, screenName } = props

  const navigation = useNavigation()

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
    <BottomScreenSheet>
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
    </BottomScreenSheet>
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
      <Image source={require("../../../../assets/stop-rect.png")} style={{ width: 17.5, height: 17.5 }} />
    )}
  </Pressable>
)
