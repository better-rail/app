import { Image, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Screen, Text } from "@/components"
import { translate } from "@/i18n"
import { useRouter } from "expo-router"
import * as storage from "@/utils/storage"
import { useIsDarkMode } from "@/hooks"
import { trackEvent } from "@/services/analytics"

const GUY_IMAGE = require("../../../assets/live-activity/guy.jpeg")
const MATAN_IMAGE = require("../../../assets/live-activity/matan.jpeg")

export function SupportUsScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()

  const finish = () => {
    storage.save("seenLiveAnnouncement", new Date().toISOString())
    router.dismissTo("/")
  }

  return (
    <Screen unsafe={true}>
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
            containerStyle={styles.tipJarButtonContainer}
            onPress={() => {
              trackEvent("live_announcement_tip_jar_press")
              finish()

              setTimeout(() => {
                router.push("/settings/tip-jar")
              }, 150)
            }}
          />
          <Text style={[styles.text, styles.tipJarNote]} tx="liveAnnounce.supportUs.tipJarNote" maxFontSizeMultiplier={1.1} />
          <Button
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
      paddingHorizontal: theme.spacing[2],
      paddingBottom: theme.spacing[5] * rt.fontScale,
    },
    content: {
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[4],
      paddingHorizontal: theme.spacing[4],
    },
    title: {
      fontSize: 30,
      textAlign: "center",
      marginBottom: theme.spacing[2],
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    text: {
      fontSize: isHighDevice ? 20 : 18,
      textAlign: "center",
    },
    avatars: {
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[5],
      flexDirection: "row",
      gap: -16,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrapper: {
      elevation: 4,
      borderRadius: 100,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      resizeMode: "cover",
    },
    descriptions: {
      gap: isHighDevice ? theme.spacing[4] : theme.spacing[2] + 1,
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
      fontSize: 18,
      marginHorizontal: -14,
    },
  }
})
