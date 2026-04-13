import {
  Image,
  ImageSourcePropType,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextStyle,
  useWindowDimensions,
  View,
} from "react-native"
import { useEffect } from "react"
import { Button, Text } from "../../components"
import { spacing } from "../../theme"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeIn } from "react-native-reanimated"
import * as storage from "../../utils/storage"
import { trackEvent } from "../../services/analytics"

const ZOLLY_IOS_URL = "https://apps.apple.com/app/id6752520444"
const ZOLLY_ANDROID_URL = "https://play.google.com/store/apps/details?id=app.zolly&referrer=utm_source%3Dbetter-rail"

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: "white",
}

const BODY_TEXT: TextStyle = {
  ...TEXT,
  fontSize: 16,
  lineHeight: 21,
  opacity: 0.95,
}

// All screenshots share the same intrinsic aspect ratio (width / height)
const SCREENSHOT_ASPECT_RATIO = 1145 / 2326

const SCREENSHOTS: ImageSourcePropType[] = [
  require("../../../assets/zolly-announcement/zolly-4.png"),
  require("../../../assets/zolly-announcement/zolly-2.png"),
  require("../../../assets/zolly-announcement/zolly-3.png"),
  require("../../../assets/zolly-announcement/zolly-5.png"),
  require("../../../assets/zolly-announcement/zolly-1.png"),
]

export function ZollyAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const ITEM_GAP = 14

  useEffect(() => {
    storage.save("seenZollyAnnouncement", new Date().toISOString())
  }, [])

  // Image height capped so everything fits on screen without scrolling
  const imageHeight = windowHeight * 0.52
  const imageWidth = imageHeight * SCREENSHOT_ASPECT_RATIO
  // Padding that centers the active image, letting adjacent ones peek in from both sides
  const sideInset = (windowWidth - imageWidth) / 2 - ITEM_GAP / 2
  const snapInterval = imageWidth + ITEM_GAP

  const handleDownload = () => {
    trackEvent("zolly_download_press")
    const url = Platform.OS === "ios" ? ZOLLY_IOS_URL : ZOLLY_ANDROID_URL
    Linking.openURL(url)
    navigation.getParent()?.navigate("mainStack", { screen: "planner" })
  }

  const handleLater = () => {
    trackEvent("zolly_later_press")
    navigation.getParent()?.navigate("mainStack", { screen: "planner" })
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#116012",
        paddingTop: insets.top + spacing[3],
        paddingBottom: insets.bottom + spacing[3],
      }}
    >
      {/* Header */}
      <View style={{ alignItems: "center", paddingHorizontal: spacing[5] }}>
        <Text style={{ ...TEXT, fontSize: 20, fontWeight: "500", marginTop: spacing[2] }}>חדש מבטר רייל</Text>
        <Image
          source={require("../../../assets/zolly-announcement/zolly.png")}
          tintColor="#def49e"
          style={{ height: 78, width: 78, resizeMode: "contain" }}
        />
        <Text style={{ ...BODY_TEXT, marginTop: spacing[1], marginBottom: spacing[2] }}>
          השוואת מחירים בין חנויות, מציאת מבצעים ושיתוף רשימת קניות
        </Text>
      </View>

      {/* Screenshot carousel */}
      <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, marginTop: spacing[3] }}>
        <ScrollView
          horizontal
          pagingEnabled={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sideInset }}
        >
          {SCREENSHOTS.map((source, index) => (
            <View key={index} style={{ marginHorizontal: ITEM_GAP / 2 }}>
              <Image source={source} style={{ width: imageWidth, height: imageHeight }} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* CTA */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[4] }}>
        <Button title="הורידו את זולי עכשיו" onPress={handleDownload} />
        <Pressable onPress={handleLater} style={{ marginTop: spacing[3], alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>אולי מאוחר יותר</Text>
        </Pressable>
      </View>
    </View>
  )
}
