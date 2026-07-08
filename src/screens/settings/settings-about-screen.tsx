import React from "react"
import { Image, Linking, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { SettingBox } from "./components/settings-box"

import { isDarkMode } from "@/theme"
import { openLink } from "@/utils/helpers/open-link"
import { deviceLocale, translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { getBuildNumber, getDeviceId, getSystemVersion, getVersion } from "react-native-device-info"
import { settingsBorderRadius } from "./settings-styles"

const TWITTER_DEEP_LINK = "twitter://user?screen_name=better_rail"
const TWITTER_WEB_URL = "https://x.com/better_rail"

// TODO: Add mail body to iOS - need to understand how to add newlines correctly
const emailBody = Platform.select({
  android: `\n\n\n\n\n\n\n\n\n\n---
App: Better Rail ${getVersion()} (${getBuildNumber()})
Device: ${getDeviceId()} (${getSystemVersion()})
App Locale: ${userLocale}
Device Locale: ${deviceLocale}
`,
  ios: "",
  default: "",
})

export function AboutScreen() {
  const router = useRouter()
  return (
    <Screen
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={[styles.settingGroup, styles.aboutGroup]}>
        <View style={styles.appIconWrapper}>
          <Image source={require("../../../assets/app-icon.png")} style={styles.appIconImage} />
        </View>

        <Text style={styles.aboutText} tx="settings.aboutText" />
      </View>

      <Text style={styles.followLabel} tx="settings.follow" preset="fieldLabel" />

      <View style={styles.settingGroup}>
        <SettingBox
          first
          last
          title={translate("settings.twitter")}
          icon="🐦"
          externalLink
          onPress={async () => {
            try {
              if (await Linking.canOpenURL(TWITTER_DEEP_LINK)) {
                await Linking.openURL(TWITTER_DEEP_LINK)
              } else {
                await openLink(TWITTER_WEB_URL)
              }
            } catch {
              await openLink(TWITTER_WEB_URL)
            }
          }}
        />
      </View>

      <View style={styles.settingGroup}>
        <SettingBox
          first
          last
          title={translate("settings.feedback")}
          icon="📨"
          onPress={() =>
            Linking.openURL(
              `mailto:feedback@better-rail.co.il?subject=${encodeURIComponent(
                "פידבק על Better Rail",
              )}&body=${encodeURIComponent(emailBody)}`,
            ).catch((error) => {
              console.error("Failed to open mail client:", error)
            })
          }
        />
      </View>
      <View style={styles.settingGroup}>
        <SettingBox
          first
          title={translate("settings.imageAttribution")}
          icon="🖼"
          onPress={() => openLink("https://better-rail.co.il/image-attributions/")}
        />
        <SettingBox
          last
          title={translate("settings.privacy")}
          chevron
          icon="✋"
          onPress={() => router.push("/settings/privacy")}
        />
      </View>

      <View style={styles.settingGroup}>
        <SettingBox
          first
          last
          title={translate("settings.sourceCode")}
          icon="🔧"
          externalLink
          onPress={() => Linking.openURL("https://github.com/guytepper/better-rail")}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing[4],
  },
  settingGroup: {
    marginBottom: theme.spacing[4],
    borderRadius: settingsBorderRadius,
    backgroundColor: theme.colors.secondaryBackground,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.dim,
    shadowRadius: 0.25,
    shadowOpacity: 0.2,
    elevation: 1,
  },
  aboutGroup: {
    alignItems: "center",
    padding: theme.spacing[4],
  },
  appIconWrapper: {
    marginBottom: theme.spacing[4],
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "#222222",
    shadowRadius: 4,
    shadowOpacity: 0.25,
  },
  appIconImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
    resizeMode: "contain",
  },
  aboutText: {
    marginBottom: theme.spacing[2],
    fontSize: 18,
    textAlign: "center",
  },
  followLabel: {
    marginBottom: theme.spacing[1],
  },
}))
