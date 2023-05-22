import React, { useState, useEffect } from "react"
import analytics from "@react-native-firebase/analytics"
import { observer } from "mobx-react-lite"
import { Platform, View, ViewStyle } from "react-native"
import { Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { SETTING_GROUP } from "./settings-styles"
import { color, isDarkMode, spacing } from "../../theme"
import { useStores } from "../../models"
import DeviceInfo from "react-native-device-info"
import { translate } from "../../i18n"
import { openLink } from "../../utils/helpers/open-link"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  padding: spacing[4],
}

export const PrivacyScreen = observer(function SettingsLanguageScreen() {
  const { user } = useStores()
  const [isBetaTester, setIsBetaTester] = useState(false)

  const onTelemetryToggle = async (disableTelemetry: boolean) => {
    if (disableTelemetry) {
      analytics().logEvent("telemetry_disabled")
      user.setDisableTelemetry(disableTelemetry)
      await analytics().setAnalyticsCollectionEnabled(false)
    } else {
      analytics().logEvent("telemetry_enabled")
      user.setDisableTelemetry(disableTelemetry)
      await analytics().setAnalyticsCollectionEnabled(true)
    }
  }

  useEffect(() => {
    DeviceInfo.getInstallerPackageName().then((value) => {
      if (value == "TestFlight") {
        setIsBetaTester(true)
      }
    })
  }, [])

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          title={translate("settings.privacyPolicy")}
          onPress={() => openLink(translate("settings.privacyPolicyLink"))}
          first
        />
        {!isBetaTester && (
          <SettingBox title="Disable Telemetry" toggle toggleValue={user.disableTelemetry} onToggle={onTelemetryToggle} last />
        )}
      </View>
    </Screen>
  )
})
