import React from "react"
import { Linking, Platform, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import Share from "react-native-share"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"
import { getVersion } from "react-native-device-info"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { SettingsScreenProps } from "../../navigators"
import { SETTING_GROUP } from "./settings-styles"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import { TouchableHighlight } from "react-native-gesture-handler"
import LinearGradient from "react-native-linear-gradient"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
}

const VERSION_TEXT: TextStyle = {
  textAlign: "center",
  color: color.dim,
}

function shareApp() {
  const url = "https://better-rail.co.il/"
  const title = "Better Rail"
  const message = translate("settings.shareMessage")

  const shareOptions = Platform.select({
    ios: {
      activityItemSources: [
        {
          placeholderItem: { type: "url", content: url },
          item: {
            default: { type: "text", content: `${message} ${url}` },
          },
          subject: {
            default: title,
          },
          linkMetadata: { title: message },
        },
      ],
    },
    default: {
      title,
      subject: title,
      message: `${message} ${url}`,
    },
  })

  Share.open(shareOptions)
}

const storeLink = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976?action=write-review",
  android: "market://details?id=com.betterrail",
})

export const SettingsScreen = observer(function SettingsScreen({ navigation }: SettingsScreenProps) {
  const isDarkMode = useIsDarkMode()

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      {Platform.OS === "ios" && (
        <TouchableOpacity
          activeOpacity={0.95}
          style={{ marginBottom: spacing[4], shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.25, shadowRadius: 3 }}
          onPress={() => navigation.navigate("paywallStack", { screen: "paywall", params: { presentation: "modal" } })}
        >
          <LinearGradient
            colors={["#0017E4", "#3793FF"]}
            style={{ height: 120, borderRadius: 16, justifyContent: "flex-end", padding: 16 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.5, y: 0 }}
          >
            <Text
              style={{
                fontFamily: "System",
                color: "white",
                fontSize: 24,
                fontWeight: "700",
                letterSpacing: -0.4,
                textAlign: "left",
              }}
            >
              Better Rail Pro
            </Text>
            <Text
              style={{
                fontFamily: "System",
                color: "white",
                fontSize: 16,
                fontWeight: "700",
                letterSpacing: -0.4,
                textAlign: "left",
              }}
            >
              Make your commute better.
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.language")}
          icon="💬"
          chevron
          onPress={() => navigation.navigate("language")}
        />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.tipJar")}
          icon="💖"
          chevron
          onPress={() => navigation.navigate("tipJar")}
        />
      </View>

      {Platform.OS === "ios" && userLocale !== "ar" && (
        <View style={SETTING_GROUP}>
          <SettingBox
            first
            last
            title={translate("settings.widget")}
            icon="📱"
            onPress={() => navigation.navigate("widgetOnboardingStack")}
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
        <SettingBox last title={translate("settings.about")} icon="ℹ️" chevron onPress={() => navigation.navigate("about")} />
      </View>

      <Text style={VERSION_TEXT}>Better Rail v{getVersion()}</Text>
    </Screen>
  )
})
