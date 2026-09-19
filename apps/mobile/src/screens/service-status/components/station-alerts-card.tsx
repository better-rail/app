import { Linking, Pressable, Switch, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Chip, Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { DAY_TYPES } from "@/models"
import type { DayType } from "@/data/rail-map-layout"
import { alertLinesFor, toggleChoice } from "../station-alerts-lines"
import { useStationAlert } from "../use-station-alert"

type StationAlertsCardProps = {
  stationId: string
}

/**
 * The card on a station's page for being told about it: a switch, and once on, whether every line
 * calling there counts or only some, and whether always or only on some of the timetable's days.
 * The server watches the station from then on (apps/server/src/station-alerts) and pushes when its
 * status changes.
 */
export function StationAlertsCard({ stationId }: StationAlertsCardProps) {
  const { alert, permission, turnOn, turnOff, setLines, setDays } = useStationAlert(stationId, "station_card")
  const lines = alertLinesFor(stationId)

  const chooseAllLines = () => {
    if (alert && alert.lineIds !== null) setLines(null)
  }

  const chooseLine = (lineId: string) => {
    if (!alert) return
    setLines(
      toggleChoice(
        alert.lineIds,
        lineId,
        lines.map((l) => l.id),
      ),
    )
  }

  const chooseAlways = () => {
    if (alert && alert.dayTypes !== null) setDays(null)
  }

  const chooseDay = (day: DayType) => {
    if (alert) setDays(toggleChoice(alert.dayTypes, day, DAY_TYPES))
  }

  const denied = !!alert && permission !== undefined && permission !== "granted"

  return (
    <View style={styles.card} testID="station-alerts-card">
      <View style={styles.header}>
        <View style={styles.texts}>
          <Text style={styles.title} tx="stationAlerts.toggle" />
          <Text style={styles.description} preset="small" tx="stationAlerts.cardDescription" />
        </View>
        <Switch
          value={!!alert}
          onValueChange={(on) => {
            if (on) void turnOn()
            else turnOff()
          }}
          testID="station-alerts-switch"
        />
      </View>

      {denied && (
        <Pressable onPress={() => Linking.openSettings()} style={styles.denied} accessibilityRole="button">
          <Text style={styles.deniedText} preset="small" tx="stationAlerts.permissionDenied" />
          <Text style={styles.link} preset="small" tx="stationAlerts.openSettings" />
        </Pressable>
      )}

      {alert && lines.length > 0 && (
        <View style={styles.group} testID="station-alerts-lines">
          <Text style={styles.hint} preset="small" tx="stationAlerts.linesHint" />
          <View style={styles.chips}>
            <ChoiceChip
              label={translate("stationAlerts.allLines") ?? ""}
              selected={alert.lineIds === null}
              onPress={chooseAllLines}
              testID="station-alerts-all-lines"
            />
            {lines.map((line) => (
              <ChoiceChip
                key={line.id}
                label={line.name[userLocale]}
                color={line.color}
                selected={alert.lineIds !== null && alert.lineIds.includes(line.id)}
                onPress={() => chooseLine(line.id)}
                testID={`station-alerts-line-${line.id}`}
              />
            ))}
          </View>
        </View>
      )}

      {alert && (
        <View style={styles.group} testID="station-alerts-days">
          <Text style={styles.hint} preset="small" tx="stationAlerts.daysHint" />
          <View style={styles.chips}>
            <ChoiceChip
              label={translate("stationAlerts.always") ?? ""}
              selected={alert.dayTypes === null}
              onPress={chooseAlways}
              testID="station-alerts-always"
            />
            {DAY_TYPES.map((day) => (
              <ChoiceChip
                key={day}
                label={translate(`serviceStatus.dayType.${day}`) ?? day}
                selected={alert.dayTypes !== null && alert.dayTypes.includes(day)}
                onPress={() => chooseDay(day)}
                testID={`station-alerts-day-${day}`}
              />
            ))}
          </View>
          <Text style={styles.caption} preset="small" tx="stationAlerts.nightHint" />
        </View>
      )}
    </View>
  )
}

/** One option: a pill, filled while chosen, with the line's colour as a dot when it is a line. */
function ChoiceChip({
  label,
  color,
  selected,
  onPress,
  testID,
}: {
  label: string
  color?: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  return (
    <View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      testID={`${testID}${selected ? "-selected" : ""}`}
    >
      <Chip variant={selected ? "primary" : "default"} onPress={onPress} style={styles.chip}>
        {color && <View style={[styles.dot, { backgroundColor: color }]} />}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      </Chip>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    color: theme.colors.label,
  },
  denied: {
    gap: 2,
  },
  deniedText: {
    color: theme.colors.error,
  },
  link: {
    color: theme.colors.link,
    fontWeight: "600",
  },
  group: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
    paddingTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  hint: {
    color: theme.colors.label,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  chip: {
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: theme.colors.whiteText,
  },
  caption: {
    color: theme.colors.label,
  },
}))
