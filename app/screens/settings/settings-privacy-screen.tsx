import React from "react"
import { setAnalyticsCollectionEnabled, trackEvent } from "../../services/analytics"
import { Platform, View, type ViewStyle, Alert } from "react-native"
import { Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { SETTING_GROUP } from "./settings-styles"
import { color, isDarkMode, spacing } from "../../theme"
import { useStores } from "../../models"
import { translate } from "../../i18n"
import { openLink } from "../../utils/helpers/open-link"
import { useIsBetaTester } from "../../hooks/use-is-beta-tester"
import RNRestart from "react-native-restart-newarch"
import * as storage from "../../utils/storage"

const TELEMETRY_DISABLED_STORAGE_KEY = "telemetry_disabled"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  padding: spacing[4],
}

export function PrivacyScreen() {
  const { user } = useStores()
  const rootStore = useStores()
  const isBetaTester = useIsBetaTester()

  const onTelemetryToggle = async (disableTelemetry: boolean) => {
    if (disableTelemetry) {
      trackEvent("telemetry_disabled")
      user.setDisableTelemetry(disableTelemetry)
      await setAnalyticsCollectionEnabled(false)
      await storage.save(TELEMETRY_DISABLED_STORAGE_KEY, true)
    } else {
      trackEvent("telemetry_enabled")
      user.setDisableTelemetry(disableTelemetry)
      await setAnalyticsCollectionEnabled(true)
      await storage.remove(TELEMETRY_DISABLED_STORAGE_KEY)
    }
  }

  const handleDeleteAllData = () => {
    Alert.alert(
      translate("settings.deleteAllData"),
      translate("settings.deleteAllDataConfirm"),
      [
        { text: translate("common.cancel"), style: "cancel" },
        {
          text: translate("common.ok"),
          style: "destructive",
          onPress: () => {
            rootStore.clearAllData()
            RNRestart.Restart()
          },
        },
      ],
      { cancelable: true },
    )
  }

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
          <SettingBox
            title={translate("settings.disableTelemetry")}
            toggle
            toggleValue={user.disableTelemetry}
            onToggle={onTelemetryToggle}
          />
        )}
      </View>
      <View style={SETTING_GROUP}>
        <SettingBox title={translate("settings.deleteAllData")} onPress={handleDeleteAllData} first last />
      </View>
    </Screen>
  )
}
