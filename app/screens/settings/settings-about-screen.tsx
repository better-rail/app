import React from "react"
import { observer } from "mobx-react-lite"
import { Image, Linking, Platform, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"

import { color, spacing, isDarkMode } from "../../theme"
import { openLink } from "../../utils/helpers/open-link"
import { translate } from "../../i18n"
import { SettingsScreenProps } from "../../navigators"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  padding: spacing[4],
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

const ABOUT_TEXT_TITLE: TextStyle = {
  marginBottom: spacing[1],
  fontSize: 24,
}

const ABOUT_TEXT: TextStyle = {
  marginBottom: spacing[2],
  fontSize: 18,
  textAlign: "center",
}

export const AboutScreen = observer(function AboutScreen({ navigation }: SettingsScreenProps) {
  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      <View style={[SETTING_GROUP, { alignItems: "center", padding: spacing[4] }]}>
        <Image
          source={require("../../../assets/guymoji.png")}
          style={{ width: 100, height: 120, resizeMode: "contain", marginBottom: 20 }}
        />
        <Text style={ABOUT_TEXT_TITLE} tx="settings.hey" />
        <Text style={ABOUT_TEXT} tx="settings.whoami" />
        <Text style={{ textAlign: "center" }} tx="settings.independenceDeclaration" />
      </View>

      <Text style={{ marginBottom: spacing[1] }} tx="settings.follow" preset="fieldLabel" />

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.twitter")}
          icon="🐦"
          externalLink
          onPress={() =>
            Linking.openURL("twitter://user?screen_name=better_rail").catch(() => {
              Linking.openURL("https://www.twitter.com/better_rail")
            })
          }
        />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.feedback")}
          icon="📨"
          onPress={() => Linking.openURL("mailto:feedback@better-rail.co.il?subject=פידבק על Better Rail")}
        />
      </View>
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title={translate("settings.imageAttribution")}
          icon="🖼"
          onPress={() => openLink("https://better-rail.co.il/image-attributions/")}
        />
        <SettingBox
          last
          title={translate("settings.privacyPolicy")}
          icon="📜"
          onPress={() => openLink(translate("settings.privacyPolicyLink"))}
        />
      </View>

      <View style={SETTING_GROUP}>
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
})
