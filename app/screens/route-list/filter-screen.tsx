import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { useStores } from "../../models"
import { SettingBox } from "../settings/components/settings-box"
import { SETTING_GROUP } from "../settings/settings-styles"
import { translate } from "../../i18n"

const WRAPPER: ViewStyle = {
  paddingTop: spacing[5],
  paddingHorizontal: spacing[4],
  minHeight: 180,
}

const TITLE: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  color: color.text,
  marginBottom: spacing[2],
}

const DESCRIPTION: TextStyle = {
  marginTop: -spacing[2],
  fontSize: 14,
  paddingHorizontal: spacing[2],
  opacity: 0.8,
}

export function FilterScreen() {
  const { settings } = useStores()

  const onToggle = (value: boolean) => {
    settings.setHideSlowTrains(value)
  }

  return (
    <View style={WRAPPER}>
      <Text style={TITLE}>{translate("routes.filter")}</Text>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("routes.hideSlowTrains")}
          toggle
          toggleValue={settings.hideSlowTrains}
          onToggle={onToggle}
        />
      </View>

      <Text style={DESCRIPTION}>{translate("routes.slowTrainsDescription")}</Text>
    </View>
  )
}
