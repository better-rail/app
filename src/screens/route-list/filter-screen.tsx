import { View, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import { SettingBox } from "@/screens/settings/components/settings-box"
import { SETTING_GROUP } from "@/screens/settings/settings-styles"
import { translate } from "@/i18n"

export function FilterScreen() {
  const { hideSlowTrains, setHideSlowTrains } = useSettingsStore(
    useShallow((s) => ({ hideSlowTrains: s.hideSlowTrains, setHideSlowTrains: s.setHideSlowTrains })),
  )

  const onToggle = (value: boolean) => {
    setHideSlowTrains(value)
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{translate("routes.filter")}</Text>

      <View style={SETTING_GROUP}>
        <SettingBox
          first
          last
          title={translate("routes.hideSlowTrains")}
          toggle
          toggleValue={hideSlowTrains}
          onToggle={onToggle}
        />
      </View>

      <Text style={styles.description}>{translate("routes.slowTrainsDescription")}</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    paddingTop: theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    minHeight: Platform.OS === "ios" ? 180 : 225,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  description: {
    marginTop: -theme.spacing[2],
    fontSize: 14,
    paddingHorizontal: theme.spacing[2],
    opacity: 0.8,
  },
}))
