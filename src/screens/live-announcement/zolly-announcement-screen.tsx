import { Image, ImageSourcePropType, Linking, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useEffect } from "react"
import { Button, Text } from "@/components"
import { useRouter } from "expo-router"
import Animated, { FadeIn } from "react-native-reanimated"
import * as storage from "@/utils/storage"
import { trackEvent } from "@/services/analytics"

const ZOLLY_IOS_URL = "https://apps.apple.com/app/id6752520444"
const ZOLLY_ANDROID_URL = "https://play.google.com/store/apps/details?id=app.zolly&referrer=utm_source%3Dbetter-rail"

// All screenshots share the same intrinsic aspect ratio (width / height)
const SCREENSHOT_ASPECT_RATIO = 1145 / 2326

const SCREENSHOTS: ImageSourcePropType[] = [
  require("../../../assets/zolly-announcement/zolly-4.png"),
  require("../../../assets/zolly-announcement/zolly-2.png"),
  require("../../../assets/zolly-announcement/zolly-3.png"),
  require("../../../assets/zolly-announcement/zolly-5.png"),
  require("../../../assets/zolly-announcement/zolly-1.png"),
]

export function ZollyAnnouncementScreen() {
  const router = useRouter()
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
    router.dismiss()
  }

  const handleLater = () => {
    trackEvent("zolly_later_press")
    router.dismiss()
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.text, styles.headerTitle]}>חדש מבטר רייל</Text>
        <Image source={require("../../../assets/zolly-announcement/zolly.png")} tintColor="#def49e" style={styles.logo} />
        <Text style={[styles.bodyText, styles.intro]}>השוואת מחירים בין חנויות, מציאת מבצעים ושיתוף רשימת קניות</Text>
      </View>

      {/* Screenshot carousel */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.carousel}>
        <ScrollView
          horizontal
          pagingEnabled={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent(sideInset)}
        >
          {SCREENSHOTS.map((source, index) => (
            <View key={index} style={styles.carouselItem(ITEM_GAP)}>
              <Image source={source} style={styles.screenshot(imageWidth, imageHeight)} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* CTA */}
      <View style={styles.cta}>
        <Button title="הורידו את זולי עכשיו" onPress={handleDownload} />
        <Pressable onPress={handleLater} style={styles.laterButton}>
          <Text style={styles.laterText}>אולי מאוחר יותר</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: "#116012",
    paddingTop: rt.insets.top + theme.spacing[3],
    paddingBottom: rt.insets.bottom + theme.spacing[3],
  },
  header: {
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    color: "white",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
    marginTop: theme.spacing[2],
  },
  bodyText: {
    fontSize: 16,
    textAlign: "center",
    color: "white",
    lineHeight: 21,
    opacity: 0.95,
  },
  intro: {
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[2],
  },
  logo: {
    height: 78,
    width: 78,
    resizeMode: "contain",
  },
  carousel: {
    flex: 1,
    marginTop: theme.spacing[3],
  },
  carouselContent: (sideInset: number) => ({
    paddingHorizontal: sideInset,
  }),
  carouselItem: (itemGap: number) => ({
    marginHorizontal: itemGap / 2,
  }),
  screenshot: (width: number, height: number) => ({
    width,
    height,
  }),
  cta: {
    paddingHorizontal: theme.spacing[5],
    marginTop: theme.spacing[4],
  },
  laterButton: {
    marginTop: theme.spacing[3],
    alignItems: "center",
  },
  laterText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
  },
}))
