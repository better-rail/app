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
  paddingTop: spacing[2],
}

const SETTING_GROUP: ViewStyle = {
  margin: spacing[4],
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
    <Screen style={ROOT} preset="scroll" statusBar="dark-content" unsafe={true}>
      <View style={SETTING_GROUP}>
        <SettingBox first last title="מדיניות פרטיות" icon="📜" onPress={() => null} />
      </View>
      <View style={SETTING_GROUP}>
        <SettingBox first title="דירוג ב- App Store" icon="⭐️" externalLink onPress={() => Linking.openURL(storeLink)} />
        <SettingBox last title="שליחת פידבק" icon="📨" externalLink onPress={() => null} />
      </View>
      <Text style={VERSION_TEXT}>Better Rail v{getVersion()}</Text>
    </Screen>
  )
})
