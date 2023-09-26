import { useEffect } from "react"
import { Dimensions, TextStyle } from "react-native"
import Animated, { useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated"
import { color, fontScale } from "../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { useNavigation } from "@react-navigation/native"
import analytics from "@react-native-firebase/analytics"

const TEXT_STYLE: TextStyle = {
  color: color.whiteText,
  fontWeight: "bold",
  textAlign: "left",
}

const { width: deviceWidth } = Dimensions.get("screen")
const barWidth = deviceWidth - 106 // 32 is the padding of the screen

export function ImportantAnnouncementBar({ title }: { title: string }) {
  const navigation = useNavigation()
  const width = useSharedValue(0)
  const opacity = useSharedValue(0)

  const onStart = () => {
    width.value = withSpring(barWidth, {
      duration: 1000,
      dampingRatio: 1.4,
    })

    opacity.value = withDelay(650, withTiming(1, { duration: 400 }))
  }

  const navigateToAnnouncements = () => {
    analytics().logEvent("urgent_announcement_bar_press")
    navigation.navigate("announcementsStack", { screen: "urgent" })
  }

  useEffect(() => {
    onStart()
  }, [])

  return (
    <TouchableOpacity onPress={navigateToAnnouncements}>
      <Animated.View
        style={{
          width,
          height: fontScale > 1 ? 40 : 32,
          marginTop: 12,
          justifyContent: "center",
          paddingHorizontal: 10,
          backgroundColor: "#e74c3c",
          borderRadius: 10,
        }}
      >
        <Animated.Text style={[TEXT_STYLE, { opacity }]} maxFontSizeMultiplier={1.15}>
          {title}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  )
}
