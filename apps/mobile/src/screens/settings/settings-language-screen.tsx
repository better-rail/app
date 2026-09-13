import React, { useState, useEffect } from "react"
import { Alert, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen } from "@/components"
import { SettingBox } from "./components/settings-box"
import { isDarkMode } from "@/theme"
import { changeUserLanguage, translate, userLocale } from "@/i18n"
import HapticFeedback from "react-native-haptic-feedback"
import { SETTING_GROUP } from "./settings-styles"

export function LanguageScreen() {
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
        onPress: () => {
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
      testID="language-settings-screen"
      style={styles.root}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          testID="language-option-he"
          first
          title="עברית"
          onPress={() => changeLanguage("he")}
          checkmark={userLocale === "he"}
        />
        <SettingBox
          testID="language-option-ar"
          title="العربية"
          onPress={() => changeLanguage("ar")}
          checkmark={userLocale === "ar"}
        />
        <SettingBox
          testID="language-option-en"
          title="English"
          onPress={() => changeLanguage("en")}
          checkmark={userLocale === "en"}
        />
        <SettingBox
          testID="language-option-ru"
          last
          title="Русский"
          onPress={() => changeLanguage("ru")}
          checkmark={userLocale === "ru"}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background,
  },
}))
