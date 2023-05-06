import { Dimensions, Pressable, PressableProps, View, ViewStyle, Image } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color } from "../../../theme"
import { Text } from "../../../components"

const { width: deviceWidth } = Dimensions.get("screen")

// option 1 - floating
// const SHEET_CONTAINER: ViewStyle = {
//   height: 75,
//   paddingHorizontal: 20,
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
//   backgroundColor: color.secondaryBackground,
//   position: "absolute",
//   width: deviceWidth - 40,
//   marginStart: 20,
//   borderRadius: 28,
//   shadowColor: "#000",
//   shadowOffset: { width: 0, height: 2.5 },
//   shadowOpacity: 0.15,
//   shadowRadius: 2,
// }

// option 2 - stack to the bottom
const SHEET_CONTAINER: ViewStyle = {
  height: 75,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: color.tertiaryBackground,
  position: "absolute",
  width: "100%",
  borderTopColor: color.separator,
  borderTopWidth: 1,
  shadowColor: "#333",
  shadowOffset: { width: 0, height: -1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
}

export function LiveRideSheet() {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        ...SHEET_CONTAINER,
        // bottom: insets.bottom > 0 ? insets.bottom + 5 : 15,
        bottom: 0,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", color: color.success }}>Arriving in 14 min</Text>
      <StopButton />
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
        // backgroundColor: pressed ? "#d56761" : "#FA827E",
        backgroundColor: pressed ? "#d56761" : "#FA827E",
        borderRadius: 30,
      },
    ]}
    {...props}
  >
    <Image source={require("../../../../assets/stop-rect.ios.png")} style={{ width: 17.5, height: 17.5 }} />
  </Pressable>
)
