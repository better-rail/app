import { Image, Linking, Platform, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useLocalSearchParams } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import { Screen, Text, Button } from "@/components"
import { useIsDarkMode, useMountEffect } from "@/hooks"
import { translate } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import { openLink } from "@/utils/helpers/open-link"

const LAWSUIT_POST_URL = "https://better-rail.co.il/israel-railways-lawsuit/"
const TWITTER_DEEP_LINK = "twitter://user?screen_name=better_rail"
const TWITTER_WEB_URL = "https://x.com/better_rail"

export function LawsuitScreen() {
  const isDarkMode = useIsDarkMode()
  const { source } = useLocalSearchParams<{ source?: string }>()
  const headerHeight = useHeaderHeight()

  useMountEffect(() => {
    const openedAt = Date.now()
    trackEvent("lawsuit_screen_view", { source: source ?? "direct" })

    return () => {
      trackEvent("lawsuit_screen_dismissed", { duration_seconds: Math.round((Date.now() - openedAt) / 1000) })
    }
  })

  const openPost = () => {
    trackEvent("lawsuit_read_post_press")
    openLink(LAWSUIT_POST_URL)
  }

  const openTwitter = async () => {
    trackEvent("lawsuit_follow_twitter_press")
    try {
      if (await Linking.canOpenURL(TWITTER_DEEP_LINK)) {
        await Linking.openURL(TWITTER_DEEP_LINK)
      } else {
        await openLink(TWITTER_WEB_URL)
      }
    } catch {
      await openLink(TWITTER_WEB_URL)
    }
  }

  return (
    <Screen unsafe statusBar={Platform.select({ ios: "light-content" })} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}>
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, styles.scrollTopInset(headerHeight)]}
          contentInsetAdjustmentBehavior="never"
          alwaysBounceVertical={false}
        >
          <Image source={require("../../../assets/app-icon.png")} style={styles.appIcon} />
          <Text preset="header" tx="lawsuit.title" style={styles.title} />
          <Text tx="lawsuit.intro" style={[styles.paragraph, styles.lead]} />
          <Text tx="lawsuit.whatNow" style={styles.paragraph} />
        </ScrollView>

        <View style={styles.buttonsWrapper}>
          <Button title={translate("lawsuit.readPost")} onPress={openPost} containerStyle={styles.button} />
          <Button
            title={translate("lawsuit.followTwitter")}
            onPress={openTwitter}
            containerStyle={styles.button}
            style={{ backgroundColor: "#000" }}
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  contentWrapper: {
    flex: 1,
    paddingBottom: theme.spacing[7],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  scrollTopInset: (headerHeight: number) => ({
    paddingTop:
      Platform.OS === "ios" ? Math.max(headerHeight - theme.spacing[5], theme.spacing[3]) : rt.insets.top + theme.spacing[3],
  }),
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: theme.spacing[4],
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: theme.spacing[4],
  },
  lead: {
    fontSize: 19,
    fontWeight: "700",
  },
  paragraph: {
    fontSize: 18,
    marginBottom: theme.spacing[4],
  },
  buttonsWrapper: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    marginTop: "auto",
  },
  button: {
    flex: 0,
    width: "100%",
    minHeight: 55,
  },
}))
