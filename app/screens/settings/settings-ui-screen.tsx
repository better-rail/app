import React from "react"
import { observer } from "mobx-react-lite"
import { Platform, View, type ViewStyle } from "react-native"
import { Screen } from "../../components"
import { SettingBox } from "./components/settings-box"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { SETTING_GROUP } from "./settings-styles"
import { useIsDarkMode } from "../../hooks"
import { useStores } from "../../models"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
}

export const UISettingsScreen = observer(function UISettingsScreen() {
  const isDarkMode = useIsDarkMode()
  const { settings } = useStores()

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("settings.showRouteCardHeader")}
          toggle
          toggleValue={settings.showRouteCardHeader}
          onToggle={(value) => settings.setShowRouteCardHeader(value)}
        />
      </View>
    </Screen>
  )
})
