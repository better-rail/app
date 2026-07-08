import { Linking, Platform, PlatformColor, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { SettingBox } from "./components/settings-box"
import { getVersion, getBuildNumber } from "react-native-device-info"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { SETTING_GROUP } from "./settings-styles"
import { useIsDarkMode, useIsBetaTester } from "@/hooks"
import { shareApp } from "./helpers/app-share-sheet"

const storeLink = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976?action=write-review",
  android: "market://details?id=com.betterrail",
})

export function SettingsScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()
  const isBetaTester = useIsBetaTester()

  return (
    <Screen
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title={translate("settings.language")}
          icon="💬"
          chevron
          onPress={() => router.push("/settings/language")}
        />
        <SettingBox
          last
          title={translate("settings.uiSettings")}
          icon="🎨"
          chevron
          onPress={() => router.push("/settings/ui-settings")}
        />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.tipJar")}
          icon="💖"
          chevron
          onPress={() => router.push("/settings/tip-jar")}
        />
      </View>

      {Platform.OS === "ios" && userLocale !== "ar" && (
        <View style={SETTING_GROUP}>
          <SettingBox
            first
            last
            title={translate("settings.widget")}
            icon="📱"
            onPress={() => router.push("/widget-onboarding")}
          />
        </View>
      )}

      <View style={SETTING_GROUP}>
        <SettingBox first title={translate("settings.share")} icon="🕺" onPress={shareApp} />
        <SettingBox
          title={Platform.select({ ios: translate("settings.rateIOS"), android: translate("settings.rateAndroid") })}
          icon="⭐️"
          onPress={() => Linking.openURL(storeLink)}
        />
        <SettingBox last title={translate("settings.about")} icon="ℹ️" chevron onPress={() => router.push("/settings/about")} />
      </View>

      <Text
        style={[
          styles.versionText,
          isBetaTester && { fontFamily: "System", fontWeight: "500", color: PlatformColor("systemOrange") },
        ]}
      >
        Better Rail {isBetaTester && "Beta "}v{getVersion()} (Build {getBuildNumber()})
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  versionText: {
    textAlign: "center",
    color: theme.colors.dim,
  },
}))
