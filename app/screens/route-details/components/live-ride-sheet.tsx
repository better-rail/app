import { useEffect, useMemo, useState } from "react"
import { Pressable, type PressableProps, Image, ActivityIndicator, type ViewStyle, PlatformColor } from "react-native"
import { color } from "../../../theme"
import { Text, BottomScreenSheet } from "../../../components"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { translate } from "../../../i18n"
import { trackEvent } from "../../../services/analytics"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

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
      <Text style={{ fontSize: 20, fontWeight: "bold", color: color.success }} maxFontSizeMultiplier={1.2}>
        {progressText}
      </Text>

      <StopButton
        loading={!ride.id}
        onPress={() => {
          ride.stopRide(ride.id)
          trackEvent("stop_live_ride")

          if (screenName === "activeRide") {
            navigation.goBack()
          }
        }}
      />
    </BottomScreenSheet>
  )
})

const STOP_BUTTON: ViewStyle = {
  width: 42.5,
  height: 42.5,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: color.stop,
  borderRadius: 30,
}

const StopButton = (props: { loading: boolean } & PressableProps) => {
  const { loading } = props
  const [isDisabled, setIsDisabled] = useState(loading)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (loading) {
      // disable the button for 5 seconds
      // this prevents frequent ride start & stop presses,
      // and gives the request time to fullfill
      timeout = setTimeout(() => {
        setIsDisabled(false)
      }, 5000)
    } else {
      // once the ride has been initiated successfuly,
      // we can enable the stop button
      setIsDisabled(false)
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [loading])

  if (isLiquidGlassSupported) {
    return (
      <Pressable>
        <LiquidGlassView interactive style={STOP_BUTTON} tintColor={PlatformColor("systemRed")}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Image source={require("../../../../assets/stop-rect.png")} style={{ width: 17.5, height: 17.5 }} />
          )}
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <Pressable disabled={isDisabled} style={STOP_BUTTON} {...props}>
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Image source={require("../../../../assets/stop-rect.png")} style={{ width: 17.5, height: 17.5 }} />
      )}
    </Pressable>
  )
}
