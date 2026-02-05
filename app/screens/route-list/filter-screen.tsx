import { View, ViewStyle, TextStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { useStores } from "../../models"
import { SettingBox } from "../settings/components/settings-box"
import { SETTING_GROUP } from "../settings/settings-styles"
import { translate } from "../../i18n"

const WRAPPER: ViewStyle = {
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  minHeight: 200,
}

const TITLE: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  color: color.text,
  marginBottom: spacing[2],
}

const DESCRIPTION: TextStyle = {
  fontSize: 14,
  paddingHorizontal: spacing[2],
  opacity: 0.8,
}

export const FilterScreen = observer(function FilterScreen() {
  const { settings } = useStores()

  const onToggle = (value: boolean) => {
    settings.setHideCollectorTrains(value)
  }

  return (
    <View style={WRAPPER}>
      <Text style={TITLE}>{translate("routes.filter")}</Text>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("routes.hideCollectorTrains")}
          toggle
          toggleValue={settings.hideCollectorTrains}
          onToggle={onToggle}
        />
      </View>

      <Text style={DESCRIPTION}>{translate("routes.collectorTrainsDescription")}</Text>
    </View>
  )
})
