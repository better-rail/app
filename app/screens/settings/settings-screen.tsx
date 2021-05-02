import React from "react"
import { observer } from "mobx-react-lite"
import { Linking, Share, Platform, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"
import { getVersion } from "react-native-device-info"

import { color, spacing } from "../../theme"
import { openLink } from "../../utils/helpers/open-link"
import { translate } from "../../i18n"
import { SettingsScreenProps } from "../../navigators"

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

const storeLink = Platform.select({ ios: "https://apps.apple.com/app/better-rail/id1562982976?action=write-review" })

export const SettingsScreen = observer(function SettingsScreen({ navigation }: SettingsScreenProps) {
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
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

      {Platform.OS === "ios" && (
        <View style={SETTING_GROUP}>
          <SettingBox
            first
            last={Platform.select({ ios: false, android: true })}
            title={translate("settings.share")}
            icon="🕺"
            onPress={() =>
              Share.share({ message: "Better Rail - האלטרנטיבה לאפליקציית רכבת ישראל", url: "https://better-rail.co.il" })
            }
          />
          <SettingBox title={translate("settings.rate")} icon="⭐️" last onPress={() => Linking.openURL(storeLink)} />
        </View>
      )}

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title={translate("settings.imageAttribution")}
          icon="🖼"
          onPress={() => openLink("https://better-rail.co.il/image-attributions/")}
        />
        <SettingBox
          title={translate("settings.privacyPolicy")}
          icon="📜"
          onPress={() => openLink("https://better-rail.co.il/privacy-policy/")}
        />
        <SettingBox
          last
          title={translate("settings.feedback")}
          icon="📨"
          onPress={() => Linking.openURL("mailto:feedback@better-rail.co.il?subject=פידבק על Better Rail")}
        />
      </View>

      <Text style={VERSION_TEXT}>Better Rail v{getVersion()}</Text>
    </Screen>
  )
})
