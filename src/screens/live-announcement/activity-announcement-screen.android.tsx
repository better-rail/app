import { Image, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"

const NOTIFICATION_IMAGE_HEBREW = require("../../../assets/live-ride/live-ride-notification.png")
const NOTIFICATION_IMAGE_ENGLISH = require("../../../assets/live-ride/live-ride-notification-english.png")

export function ActivityAnnouncementScreen() {
  const router = useRouter()
  const NOTIFICATION_IMAGE = userLocale === "he" ? NOTIFICATION_IMAGE_HEBREW : NOTIFICATION_IMAGE_ENGLISH

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text tx="liveAnnounce.liveActivity.androidTitle" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
        <Text tx="liveAnnounce.liveActivity.androidDescription" style={styles.text} maxFontSizeMultiplier={1.1} />

        <Image source={NOTIFICATION_IMAGE} style={styles.liveActivityImage} />
        <Text tx="liveAnnounce.liveActivity.tip" style={[styles.text, styles.tipText]} maxFontSizeMultiplier={1.1} />

        <Button onPress={() => router.push("/live-announcement/support-us")} title={translate("common.next") ?? ""} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.tertiaryBackground,
  },
  scrollContent: {
    paddingTop: theme.spacing[7] + 4,
    paddingBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.tertiaryBackground,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: theme.spacing[2],
  },
  text: {
    fontSize: 22,
    textAlign: "center",
    lineHeight: 29,
  },
  tipText: {
    fontSize: 20,
    marginBottom: theme.spacing[4],
  },
  liveActivityImage: {
    width: "100%",
    height: 355,
    resizeMode: "contain",
    marginVertical: theme.spacing[4],
  },
}))
