import { Image, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"

export function LiveAnnouncementScreen() {
  const router = useRouter()
  const LIVE_IMAGE =
    userLocale === "he"
      ? require("../../../assets/live-ride/live-ride-intro.png")
      : require("../../../assets/live-ride/live-ride-intro-english.png")

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text tx="liveAnnounce.announcement.subtitle" style={styles.subTitle} maxFontSizeMultiplier={1.2} />
        <Text tx="liveAnnounce.announcement.title" style={styles.title} maxFontSizeMultiplier={1.2} />
        <Image source={LIVE_IMAGE} style={styles.image} />
        <Text
          tx="liveAnnounce.announcement.androidDescription"
          style={[styles.text, styles.descriptionText]}
          maxFontSizeMultiplier={1.2}
        />

        <Button onPress={() => router.push("/live-announcement/start-ride")} title={translate("common.next") ?? ""} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
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
  subTitle: {
    fontSize: 24,
    textAlign: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    fontSize: 22,
    textAlign: "center",
  },
  descriptionText: {
    marginBottom: theme.spacing[5],
  },
  image: {
    width: "100%",
    height: 420,
    resizeMode: "contain",
    marginVertical: rt.fontScale > 1.1 ? theme.spacing[4] : theme.spacing[5],
  },
}))
