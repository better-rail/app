import React, { useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Platform, View, type ViewStyle } from "react-native"
import { Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { color, isDarkMode, spacing } from "../../theme"
import { changeUserLanguage, translate, userLocale } from "../../i18n"
import HapticFeedback from "react-native-haptic-feedback"
import { SETTING_GROUP } from "./settings-styles"
import { messaging } from "../../services/firebase/messaging"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
}

export const LanguageScreen = observer(function SettingsLanguageScreen() {
  const [clickCounter, setClickCounter] = useState(0)

  const changeLanguage = async (langaugeCode) => {
    if (langaugeCode === userLocale) {
      setClickCounter(clickCounter + 1)
      return
    }

    Alert.alert(translate("settings.languageChangeAlertTitle"), translate("settings.languageChangeAlertMessage"), [
      { text: translate("common.cancel"), style: "cancel" },
      {
        text: translate("common.ok"),
        onPress: async () => {
          const notificationsEnabled = await messaging.hasPermission()

          if (notificationsEnabled) {
            let unsubscribeTopic = `service-updates-${userLocale}`
            let subscribeTopic = `service-updates-${langaugeCode}`

            if (__DEV__) {
              unsubscribeTopic = `service-updates-test-${userLocale}`
              subscribeTopic = `service-updates-test-${langaugeCode}`
            }

            await Promise.all([
              messaging.unsubscribeFromTopic(`service-updates-${userLocale}`),
              messaging.subscribeToTopic(`service-updates-${langaugeCode}`),
            ])
          }

          changeUserLanguage(langaugeCode)
        },
      },
    ])
  }

  useEffect(() => {
    if (clickCounter === 5) {
      HapticFeedback.trigger("notificationError")
      Alert.alert(translate("common.relax"))
    }
  }, [clickCounter])

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      <View style={SETTING_GROUP}>
        <SettingBox first title="עברית" onPress={() => changeLanguage("he")} checkmark={userLocale === "he"} />
        <SettingBox title="العربية" onPress={() => changeLanguage("ar")} checkmark={userLocale === "ar"} />
        <SettingBox title="English" onPress={() => changeLanguage("en")} checkmark={userLocale === "en"} />
        <SettingBox last title="Русский" onPress={() => changeLanguage("ru")} checkmark={userLocale === "ru"} />
      </View>
    </Screen>
  )
})
