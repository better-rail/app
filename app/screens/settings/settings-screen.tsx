import React from "react"
import { observer } from "mobx-react-lite"
import { Appearance, Linking, Platform, TextStyle, View, ViewStyle } from "react-native"
import Share from "react-native-share"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"
import { getVersion } from "react-native-device-info"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { SettingsScreenProps } from "../../navigators"

const isDarkMode = Appearance.getColorScheme() === "dark"

const ROOT: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
}

const SETTING_GROUP: ViewStyle = {
  marginBottom: spacing[4],
  borderRadius: 10,
  backgroundColor: color.secondaryBackground,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 0.25,
  shadowOpacity: 0.2,
  elevation: 1,
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
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}>
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
