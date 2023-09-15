import { useEffect } from "react"
import { Dimensions, TextStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated"
import { color, fontScale } from "../../theme"

const TEXT_STYLE: TextStyle = {
  color: color.whiteText,
  fontWeight: "bold",
  textAlign: "left",
}

const { width: deviceWidth } = Dimensions.get("screen")
const barWidth = deviceWidth - 32 // 32 is the padding of the screen

export function ImoprtantAnnouncementBar() {
  const width = useSharedValue(0)
  const opacity = useSharedValue(0)

  const onStart = () => {
    width.value = withSpring(barWidth, {
      duration: 1000,
      dampingRatio: 1.4,
    })

    opacity.value = withDelay(650, withTiming(1, { duration: 400 }))
  }

  const onHide = () => {
    width.value = 0
    opacity.value = 0
  }

  useEffect(() => {
    onStart()
    return onHide
  })

  return (
    <Animated.View
      style={{
        width,
        height: fontScale > 1 ? 50 : 41,

        justifyContent: "center",
        paddingHorizontal: 10,
        backgroundColor: "#e74c3c",
        borderRadius: 10,
      }}
    >
      <Animated.Text style={[TEXT_STYLE, { opacity }]} maxFontSizeMultiplier={1.1}>
        Important message from Israel Railways
      </Animated.Text>
    </Animated.View>
  )
}
