import React from "react"
import { observer } from "mobx-react-lite"
import { Linking, Platform, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"
import { getVersion } from "react-native-device-info"

import { color, spacing } from "../../theme"

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
}

const VERSION_TEXT: TextStyle = {
  textAlign: "center",
  color: color.dim,
}

const storeLink = Platform.select({ ios: "https://apps.apple.com/app/better-rail/id1562982976" })

export const SettingsScreen = observer(function SettingsScreen() {
  return (
    <Screen
      style={ROOT}
      preset="scroll"
      statusBar="dark-content"
      unsafe={true}
      statusBarBackgroundColor={color.secondaryBackground}
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title="שליחת פידבק"
          icon="📨"
          externalLink
          onPress={() => Linking.openURL("mailto:hey@guytepper.com?subject=פידבק על Better Rail")}
        />
      </View>

      {/* <View style={SETTING_GROUP}>
        <SettingBox first last title="דירוג ב- App Store" icon="⭐️" externalLink onPress={() => Linking.openURL(storeLink)} />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox first title="אודות" icon="🕺" onPress={() => null} />
        <SettingBox last title="מדיניות פרטיות" icon="📜" onPress={() => null} />
      </View> */}

      <Text style={VERSION_TEXT}>Better Rail v{getVersion()}</Text>
    </Screen>
  )
})
