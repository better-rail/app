import { Image, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Screen, Text } from "@/components"
import { Stack, useRouter } from "expo-router"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { translate } from "@/i18n"
import * as storage from "@/utils/storage"
import { useIsDarkMode } from "@/hooks"
import { NextButton } from "./announcement-next-button"
import { trackEvent } from "@/services/analytics"

const GUY_IMAGE = require("../../../assets/live-activity/guy.jpeg")
const MATAN_IMAGE = require("../../../assets/live-activity/matan.jpeg")

export function SupportUsScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()

  const finish = () => {
    storage.save("seenLiveAnnouncement", new Date().toISOString())
    router.dismissAll()
  }

  return (
    <Screen unsafe={true} statusBar="light-content">
      <Stack.Screen options={{ headerLeft: () => null }} />
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text tx="liveAnnounce.supportUs.title" preset="header" style={styles.title} />

          <View style={styles.avatars}>
            <View style={styles.avatarWrapper}>
              <Image source={GUY_IMAGE} style={styles.avatar} />
            </View>
            <View style={styles.avatarWrapper}>
              <Image source={MATAN_IMAGE} style={styles.avatar} />
            </View>
          </View>
          <View style={styles.descriptions}>
            <Text tx="liveAnnounce.supportUs.description1" style={styles.text} maxFontSizeMultiplier={1.1} />
            <View>
              <Text tx="liveAnnounce.supportUs.description3" style={styles.text} maxFontSizeMultiplier={1.1} />
            </View>
            <Text tx="liveAnnounce.supportUs.description4" style={styles.text} maxFontSizeMultiplier={1.1} />
            <Text tx="liveAnnounce.supportUs.description5" style={[styles.text]} maxFontSizeMultiplier={1.1} />
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.actions}>
          <Button
            title={translate("liveAnnounce.supportUs.tipJarButton") ?? ""}
            style={styles.tipJarButton(isDarkMode)}
            variant="success"
            containerStyle={styles.tipJarButtonContainer}
            onPress={() => {
              trackEvent("live_announcement_tip_jar_press")
              finish()

              setTimeout(() => {
                router.push("/settings/tip-jar")
              }, 150)
            }}
          />
          <Text style={[styles.text, styles.tipJarNote]} tx="liveAnnounce.supportUs.tipJarNote" />
          <NextButton
            title={translate("common.done") ?? ""}
            onPress={() => {
              trackEvent("live_announcement_done_press")
              finish()
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => {
  const deviceHeight = rt.screen.height
  const isHighDevice = deviceHeight > 800

  return {
    scrollContent: {
      paddingTop: rt.insets.top + 4,
      paddingHorizontal: theme.spacing[5],
      paddingBottom: theme.spacing[5] * rt.fontScale,
    },
    content: {
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[4],
    },
    title: {
      color: theme.colors.whiteText,
      fontSize: 30,
      textAlign: "center",
      marginBottom: theme.spacing[2],
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    text: {
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.whiteText,
    },
    avatars: {
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[5],
      flexDirection: "row",
      gap: -24,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrapper: {
      shadowColor: "#333",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 5,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      resizeMode: "cover",
    },
    descriptions: {
      gap: isHighDevice ? theme.spacing[3] + 1 : theme.spacing[2] + 1,
    },
    spacer: {
      flex: 1,
    },
    actions: {
      gap: theme.spacing[3],
    },
    tipJarButton: (isDarkMode: boolean) => ({
      minHeight: 55 * rt.fontScale,
      backgroundColor: isDarkMode ? theme.colors.success : theme.colors.greenText,
    }),
    tipJarButtonContainer: {
      minHeight: 55 * rt.fontScale,
    },
    tipJarNote: {
      fontSize: 14,
      marginHorizontal: -14,
    },
  }
})
