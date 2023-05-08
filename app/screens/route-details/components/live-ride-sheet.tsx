import { Pressable, PressableProps, View, ViewStyle, Image, useColorScheme } from "react-native"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color } from "../../../theme"
import { Text } from "../../../components"
import { useRideProgress } from "../../../hooks/use-ride-progress"
import { RouteItem } from "../../../services/api"
import { useMemo } from "react"

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

export function LiveRideSheet({ route }: { route: RouteItem }) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [status, minutesLeft] = useRideProgress(route)

  const progressText = useMemo(() => {
    console.log("ssss", status)
    if (status === "inTransit" && minutesLeft < 1) {
      return `Train arrives now`
    } else if (status === "inTransit") {
      return `Arriving in ${minutesLeft} min`
    } else if (status === "arrived") {
      return "You have arrived"
    } else if ((status === "waitForTrain" || status === "inExchange") && minutesLeft < 1) {
      return `Train departs now`
    }

    return `Train departs in ${minutesLeft} min`
  }, [minutesLeft, status])

  console.log("progress", status, minutesLeft)
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
      <StopButton />
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
        backgroundColor: pressed ? "#d56761" : "#FA827E",
        borderRadius: 30,
      },
    ]}
    {...props}
  >
    <Image source={require("../../../../assets/stop-rect.ios.png")} style={{ width: 17.5, height: 17.5 }} />
  </Pressable>
)
