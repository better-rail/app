import { Image, Pressable, Switch, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { router } from "expo-router"
import { Screen, Text } from "@/components"
import { isRTL, translate } from "@/i18n"
import { getStationById, stationsObject } from "@/data/stations"
import { useRecurringRidesStore, type RecurringRide } from "@/models/recurring-rides/recurring-rides"
import { leadTimeLabel, weekdayFullName, weekdayName, WEEKDAYS } from "@/screens/recurring-ride/recurring-ride-format"
import { formatClockTime } from "@/utils/helpers/date-helpers"
import { subheadingFontStyle } from "@/theme/theme-fonts"

const arrowIcon = require("../../../assets/arrow-left.png")

const textShadow = {
  textShadowColor: "rgba(0, 0, 0, 0.9)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 3,
}

/** Better Rail Live settings. Auto Start is its first section; other live ride settings can join it here. */
export function LiveSettingsScreen() {
  const rides = useRecurringRidesStore((state) => state.rides)

  return (
    <Screen testID="live-settings-screen" style={styles.root} preset="scroll" unsafe>
      <Text style={styles.groupTitle}>{translate("recurringRides.settingsTitle")}</Text>
      {rides.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {rides.map((ride) => (
            <RecurringRideCard key={ride.id} ride={ride} />
          ))}
          <Text style={styles.description}>{translate("recurringRides.settingsDescription")}</Text>
        </>
      )}
    </Screen>
  )
}

/** A faded outline of a ride card, then how to add one */
function EmptyState() {
  return (
    <View testID="recurring-rides-empty" style={styles.empty}>
      <View style={styles.ghostCard} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.ghostHeader}>
          <View style={styles.ghostStations}>
            <View style={[styles.ghostBar, { width: "62%", height: 14 }]} />
            <View style={[styles.ghostBar, { width: "44%", height: 11 }]} />
          </View>
          <View style={styles.ghostSwitch} />
        </View>
        <View style={[styles.ghostBar, styles.ghostTime]} />
        <View style={styles.ghostDays}>
          {WEEKDAYS.map((day) => (
            <View key={day} style={[styles.ghostDay, day < 5 && styles.ghostDaySelected]} />
          ))}
        </View>
      </View>
      <Text style={styles.emptyTitle}>{translate("recurringRides.emptyTitle")}</Text>
      <Text style={styles.emptyBody}>{translate("recurringRides.emptyBody")}</Text>
    </View>
  )
}

/** Like an alarm: tapping the card edits the ride, the switch pauses it. Deleting is in the editor. */
function RecurringRideCard({ ride }: { ride: RecurringRide }) {
  const setEnabled = (enabled: boolean) => useRecurringRidesStore.getState().setEnabled(ride.id, enabled)
  const origin = stationsObject[String(ride.originId)]
  const destination = getStationById(String(ride.destinationId))?.name ?? ""

  return (
    <Pressable
      testID={`recurring-ride-${ride.id}`}
      accessibilityRole="button"
      accessibilityHint={translate("recurringRides.editHint") ?? undefined}
      onPress={() => router.push({ pathname: "/recurring-ride", params: { rideId: ride.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Styled after the schedule widget: the origin's photo under a dark overlay */}
      <Image source={origin?.image} style={styles.photo} resizeMode="cover" />
      <View style={[styles.overlay, !ride.enabled && styles.overlayPaused]} />

      <View style={styles.cardContent}>
        <View style={styles.header}>
          <View style={[styles.stations, !ride.enabled && styles.paused]}>
            <Text style={styles.origin} numberOfLines={2}>
              {getStationById(String(ride.originId))?.name}
            </Text>
            <View style={styles.destinationRow}>
              <View style={styles.arrowCircle}>
                <Image source={arrowIcon} style={styles.arrowIcon} />
              </View>
              <Text style={styles.destination} numberOfLines={2}>
                {destination}
              </Text>
            </View>
          </View>
          <Switch
            testID={`recurring-ride-${ride.id}-${ride.enabled ? "on" : "off"}`}
            value={ride.enabled}
            onValueChange={setEnabled}
          />
        </View>

        <View style={[styles.footer, !ride.enabled && styles.paused]}>
          <Text style={styles.label}>{translate("routes.departure")}</Text>
          <Text style={styles.time}>{formatClockTime(ride.departureTime)}</Text>
          <View style={styles.meta}>
            <View style={styles.days} accessible accessibilityLabel={ride.days.map(weekdayFullName).join(", ")}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={[styles.day, ride.days.includes(day) && styles.daySelected]}>
                  {weekdayName(day)}
                </Text>
              ))}
            </View>
            <Text style={styles.metaText} accessibilityElementsHidden importantForAccessibility="no">
              ‧
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {leadTimeLabel(ride.leadMinutes)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
  groupTitle: {
    marginStart: theme.spacing[3],
    marginBottom: theme.spacing[2],
    color: theme.colors.label,
    ...subheadingFontStyle(theme, 16, "600"),
  },
  // Footer under the cards, like an iOS settings section footer
  description: {
    marginTop: -theme.spacing[2],
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[3],
    fontSize: 13,
    opacity: 0.6,
  },
  empty: {
    alignItems: "center",
    paddingTop: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  // The shape of a ride card, drawn in outline
  ghostCard: {
    alignSelf: "stretch",
    gap: theme.spacing[3],
    marginBottom: theme.spacing[5],
    padding: 14,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.label,
    opacity: 0.45,
  },
  ghostHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  ghostStations: {
    flex: 1,
    gap: 7,
  },
  ghostBar: {
    borderRadius: 6,
    backgroundColor: theme.colors.label,
    opacity: 0.5,
  },
  ghostSwitch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: theme.colors.label,
    opacity: 0.35,
  },
  ghostTime: {
    width: "34%",
    height: 30,
    marginTop: theme.spacing[2],
  },
  ghostDays: {
    flexDirection: "row",
    gap: 6,
  },
  ghostDay: {
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.label,
    opacity: 0.25,
  },
  ghostDaySelected: {
    backgroundColor: theme.colors.primary,
    opacity: 0.9,
  },
  emptyTitle: {
    marginBottom: theme.spacing[2],
    textAlign: "center",
    color: theme.colors.text,
    ...subheadingFontStyle(theme, 18, "700"),
  },
  emptyBody: {
    maxWidth: 300,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.6,
  },
  card: {
    marginBottom: theme.spacing[4],
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#16181D",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  pressed: {
    opacity: 0.85,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayPaused: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  cardContent: {
    padding: 14,
    gap: theme.spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  stations: {
    flex: 1,
  },
  origin: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...textShadow,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  arrowCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    width: 9,
    height: 9,
    tintColor: "#000000",
    transform: isRTL ? undefined : [{ rotate: "180deg" }],
  },
  destination: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "600",
    fontFamily: theme.typography.primary,
    ...textShadow,
  },
  footer: {
    alignItems: "flex-start",
  },
  label: {
    color: "#FF9999",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    ...textShadow,
  },
  time: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    lineHeight: 40,
    ...textShadow,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  days: {
    flexDirection: "row",
    gap: 5,
  },
  day: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
  },
  daySelected: {
    color: "#FFFFFF",
  },
  metaText: {
    flexShrink: 1,
    color: "#B6B9BA",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...textShadow,
  },
  paused: {
    opacity: 0.5,
  },
}))
