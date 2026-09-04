import { Text, TouchableOpacity } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { translate } from "@/i18n"
import { useSettingsStore } from "@/models"
import { useMountEffect } from "@/hooks"
import { trackEvent } from "@/services/analytics"

// The bar remounts whenever the urgent bar or an active ride takes over the header and then goes
// away again, so the impression is guarded to once per app launch — otherwise a single user
// toggling a live ride inflates the denominator for `lawsuit_announcement_bar_press`.
let hasTrackedImpression = false

export function LawsuitAnnouncementBar() {
  const router = useRouter()
  const setSeenLawsuitAnnouncement = useSettingsStore((s) => s.setSeenLawsuitAnnouncement)

  useMountEffect(() => {
    if (hasTrackedImpression) return
    hasTrackedImpression = true
    trackEvent("lawsuit_announcement_bar_shown")
  })

  const openLawsuitModal = () => {
    trackEvent("lawsuit_announcement_bar_press")
    setSeenLawsuitAnnouncement(true)
    router.push({ pathname: "/lawsuit", params: { source: "announcement_bar" } })
  }

  return (
    <TouchableOpacity activeOpacity={0.75} style={styles.wrapper} onPress={openLawsuitModal}>
      <Text style={styles.text} maxFontSizeMultiplier={1.15} numberOfLines={1}>
        {translate("lawsuit.title")}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    flex: 1,
    height: rt.fontScale > 1 ? 40 : 32,
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#e74c3c",
    borderRadius: 10,
  },
  text: {
    color: theme.colors.whiteText,
    fontWeight: "bold",
    textAlign: "center",
  },
}))
