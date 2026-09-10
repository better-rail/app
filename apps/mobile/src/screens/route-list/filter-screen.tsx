import { View, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import type { MaxChanges } from "@/models/settings/settings"
import { SettingBox } from "@/screens/settings/components/settings-box"
import { SETTING_GROUP, SETTING_GROUP_TITLE } from "@/screens/settings/settings-styles"
import { translate, TxKeyPath } from "@/i18n"

const CHANGES_OPTIONS: { label: TxKeyPath; value: MaxChanges }[] = [
  { label: "routes.changesNoLimit", value: null },
  { label: "routes.changesDirectOnly", value: 0 },
  { label: "routes.changesUpToOne", value: 1 },
]

export function FilterScreen() {
  const { hideSlowTrains, setHideSlowTrains, maxChanges, setMaxChanges } = useSettingsStore(
    useShallow((s) => ({
      hideSlowTrains: s.hideSlowTrains,
      setHideSlowTrains: s.setHideSlowTrains,
      maxChanges: s.maxChanges,
      setMaxChanges: s.setMaxChanges,
    })),
  )

  return (
    <View testID="route-filter-screen" style={styles.wrapper}>
      <Text style={styles.title}>{translate("routes.filter")}</Text>

      <View style={SETTING_GROUP}>
        <SettingBox
          testID="filter-hide-slow-trains"
          first
          last
          title={translate("routes.hideSlowTrains")}
          toggle
          toggleValue={hideSlowTrains}
          onToggle={setHideSlowTrains}
        />
      </View>

      <Text style={styles.description}>{translate("routes.slowTrainsDescription")}</Text>

      <Text style={SETTING_GROUP_TITLE}>{translate("routes.changesFilterTitle")}</Text>
      <View style={SETTING_GROUP}>
        {CHANGES_OPTIONS.map((option, index) => (
          <SettingBox
            testID={`filter-changes-${option.value ?? "any"}`}
            key={String(option.value)}
            first={index === 0}
            last={index === CHANGES_OPTIONS.length - 1}
            title={translate(option.label)}
            checkmark={maxChanges === option.value}
            onPress={() => setMaxChanges(option.value)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    paddingTop: theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: Platform.OS === "ios" ? theme.spacing[4] : theme.spacing[6],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  description: {
    marginTop: -theme.spacing[2],
    marginBottom: theme.spacing[5],
    fontSize: 14,
    paddingHorizontal: theme.spacing[2],
    opacity: 0.8,
  },
}))
