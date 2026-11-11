import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { translate } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import { useRecurringRidesStore } from "@/models/recurring-rides/recurring-rides"
import { describeRoute, describeSchedule } from "@/screens/recurring-ride/recurring-ride-format"
import { SettingBox } from "./components/settings-box"
import { settingsStyles } from "./settings-styles"

export function RecurringRidesScreen() {
  const rides = useRecurringRidesStore((state) => state.rides)
  const { setEnabled, remove } = useRecurringRidesStore.getState()

  return (
    <Screen testID="recurring-rides-screen" style={styles.root} preset="scroll" unsafe>
      <Text style={styles.description}>{translate("recurringRides.settingsDescription")}</Text>

      {rides.map((ride) => (
        <View key={ride.id}>
          <View style={settingsStyles.group}>
            <SettingBox
              testID={`recurring-ride-${ride.id}`}
              first
              title={describeRoute(ride)}
              toggle
              toggleValue={ride.enabled}
              onToggle={(enabled) => setEnabled(ride.id, enabled)}
            />
            <SettingBox
              last
              title={translate("recurringRides.remove") ?? ""}
              onPress={() => {
                remove(ride.id)
                trackEvent("recurring_ride_removed", { source: "settings" })
              }}
            />
          </View>
          <Text style={styles.schedule}>{describeSchedule(ride)}</Text>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
  description: {
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
    fontSize: 14,
    opacity: 0.8,
  },
  schedule: {
    marginTop: -theme.spacing[3],
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[3],
    fontSize: 13,
    opacity: 0.7,
  },
}))
