import { useEffect } from "react"
import { Dimensions, TextStyle, TouchableOpacity } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated"
import { color, fontScale } from "../../theme"
import { useNavigation } from "@react-navigation/native"
import analytics from "@react-native-firebase/analytics"
import { removeHtmlTagsAndEntities } from "../../components/announcements/announcements-utils"

const TEXT_STYLE: TextStyle = {
  color: color.whiteText,
  fontWeight: "bold",
  textAlign: "left",
}

const { width: deviceWidth } = Dimensions.get("screen")
const barWidth = deviceWidth - 106 // 106 is the padding of the screen + header buttons

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export function ImportantAnnouncementBar({ title }: { title: string }) {
  const navigation = useNavigation()
  const width = useSharedValue(0)
  const opacity = useSharedValue(0)

  const onStart = () => {
    width.value = withTiming(barWidth, {
      duration: 1000,
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

  const WrapperAnimatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }))

  const TextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <AnimatedTouchable
      activeOpacity={0.75}
      style={[
        {
          height: fontScale > 1 ? 40 : 32,
          marginTop: 12,
          justifyContent: "center",
          paddingHorizontal: 10,
          backgroundColor: "#e74c3c",
          borderRadius: 10,
        },
        WrapperAnimatedStyle,
      ]}
      onPress={navigateToAnnouncements}
    >
      <Animated.Text style={[TEXT_STYLE, TextAnimatedStyle]} maxFontSizeMultiplier={1.15}>
        {removeHtmlTagsAndEntities(title)}
      </Animated.Text>
    </AnimatedTouchable>
  )
}
