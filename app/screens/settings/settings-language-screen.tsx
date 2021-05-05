import React, { useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, View, ViewStyle } from "react-native"
import { Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { color, spacing } from "../../theme"
import { changeUserLanguage, translate, userLocale } from "../../i18n"
import HapticFeedback from "react-native-haptic-feedback"

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

export const LanguageScreen = observer(function SettingsLanguageScreen() {
  const [clickCounter, setClickCounter] = useState(0)

  const changeLanguage = (langaugeCode) => {
    if (langaugeCode === userLocale) {
      setClickCounter(clickCounter + 1)
      return
    }

    Alert.alert(translate("settings.languageChangeAlertTitle"), translate("settings.languageChangeAlertMessage"), [
      { text: translate("common.cancel"), style: "cancel" },
      { text: translate("common.ok"), onPress: () => changeUserLanguage(langaugeCode) },
    ])
  }

  useEffect(() => {
    if (clickCounter === 5) {
      HapticFeedback.trigger("notificationError")
      Alert.alert(translate("common.relax"))
    }
  }, [clickCounter])

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <View style={SETTING_GROUP}>
        <SettingBox first title="עברית" onPress={() => changeLanguage("he")} checkmark={userLocale === "he"} />
        {/* <SettingBox title="العربية" /> */}
        <SettingBox last title="English" onPress={() => changeLanguage("en")} checkmark={userLocale === "en"} />
        {/* <SettingBox last title="русский" /> */}
      </View>
    </Screen>
  )
})
