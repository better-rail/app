import React from "react"
import { observer } from "mobx-react-lite"
import { Linking, Share, Platform, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { SettingBox } from "./components/settings-box"
import { getVersion } from "react-native-device-info"

import { color, spacing } from "../../theme"
import { openLink } from "../../utils/helpers/open-link"

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
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBarBackgroundColor={color.secondaryBackground}>
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title="עדכונים בטוויטר"
          icon="🐦"
          onPress={() =>
            Linking.canOpenURL("twitter://user?screen_name=better_rail").then((supported) => {
              if (supported) {
                Linking.openURL("twitter://user?screen_name=better_rail")
              } else {
                Linking.openURL("https://www.twitter.com/better_rail`")
              }
            })
          }
        />
        <SettingBox
          last
          title="עדכונים בפייסבוק"
          icon="🥸"
          onPress={() => Linking.openURL("https://www.facebook.com/BetterRail")}
        />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title="שתפו את Better Rail"
          icon="🕺"
          onPress={() =>
            Share.share({ message: "Better Rail - האלטרנטיבה לאפליקציית רכבת ישראל", url: "https://better-rail.co.il" })
          }
        />
        <SettingBox title="דרגו ב- App Store" icon="⭐️" onPress={() => Linking.openURL(storeLink)} />
        <SettingBox
          last
          title="שליחת פידבק"
          icon="📨"
          onPress={() => Linking.openURL("mailto:feedback@better-rail.co.il?subject=פידבק על Better Rail")}
        />
      </View>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          title="קרדיט תמונות"
          icon="🖼"
          onPress={() => openLink("https://better-rail.co.il/image-attributions/")}
        />
        <SettingBox last title="מדיניות פרטיות" icon="📜" onPress={() => openLink("https://better-rail.co.il/privacy-policy/")} />
      </View>

      <Text style={VERSION_TEXT}>Better Rail v{getVersion()}</Text>
    </Screen>
  )
})
