import { useEffect } from "react"
import { Dimensions, TouchableOpacity } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated"
import { useRouter } from "expo-router"
import { trackEvent } from "@/services/analytics"
import { removeHtmlTagsAndEntities } from "@/components/announcements/announcements-utils"

const { width: deviceWidth } = Dimensions.get("screen")
const barWidth = deviceWidth - 106 // 106 is the padding of the screen + header buttons

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export function ImportantAnnouncementBar({ title }: { title: string }) {
  const router = useRouter()
  const width = useSharedValue(0)
  const opacity = useSharedValue(0)

  const onStart = () => {
    width.value = withTiming(barWidth, {
      duration: 1000,
    })

    opacity.value = withDelay(650, withTiming(1, { duration: 400 }))
  }

  const navigateToAnnouncements = () => {
    trackEvent("urgent_announcement_bar_press")
    router.push("/announcements/urgent")
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
    <AnimatedTouchable activeOpacity={0.75} style={[styles.wrapper, WrapperAnimatedStyle]} onPress={navigateToAnnouncements}>
      <Animated.Text style={[styles.text, TextAnimatedStyle]} maxFontSizeMultiplier={1.15}>
        {truncateString(removeHtmlTagsAndEntities(title), 5)}
      </Animated.Text>
    </AnimatedTouchable>
  )
}

function truncateString(inputString: string, numWords: number) {
  // Split the input string into an array of words
  const words = inputString.split(" ")

  // Take the first 'numWords' words and join them back into a string
  const truncatedString = words.slice(0, numWords).join(" ")

  // Add "..." to the end if there are more words in the original string
  if (words.length > numWords) {
    return truncatedString + " ..."
  } else {
    return truncatedString
  }
}

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    height: rt.fontScale > 1 ? 40 : 32,
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#e74c3c",
    borderRadius: 10,
  },
  text: {
    color: theme.colors.whiteText,
    fontWeight: "bold",
    textAlign: "left",
  },
}))
