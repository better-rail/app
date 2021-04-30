import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { SettingBox } from "../settings/components/settings-box"
import { color, spacing } from "../../theme"
import { changeUserLanguage, userLocale } from "../../i18n"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
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

export const SettingsLanguageScreen = observer(function SettingsLanguageScreen() {
  const [appLanguage, setappLanguage] = useState(userLocale)

  const changeLanguage = (langaugeCode) => {
    changeUserLanguage(langaugeCode)
  }

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <View style={SETTING_GROUP}>
        <SettingBox first title="עברית" onPress={() => changeLanguage("he")} checkmark={appLanguage === "he"} />
        {/* <SettingBox title="العربية" /> */}
        <SettingBox last title="English" onPress={() => changeLanguage("en")} checkmark={appLanguage === "en"} />
        {/* <SettingBox last title="русский" /> */}
      </View>
    </Screen>
  )
})
