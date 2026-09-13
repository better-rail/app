import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, type TxKeyPath } from "@/i18n"
import type { StationEntrance, StationHours, StationHoursKind } from "@/services/api"
import { dayRangeLabel, entranceOpenBadge, hoursOfKind, type OpenBadge, type WallClock } from "../station-hours"

const KINDS: StationHoursKind[] = ["entrance", "ticketOffice", "customerService"]

type EntranceCardProps = {
  entrance: StationEntrance
  /** Names a day (1 = Sunday) in the user's language. */
  dayName: (day: number) => string
  /** Israel's wall clock now, for whether the entrance is open. */
  clock: WallClock
}

/** One entrance of the station: its hours (and the ticket office's and the desk's), and what is there. */
export function EntranceCard({ entrance, dayName, clock }: EntranceCardProps) {
  const kinds = KINDS.map((kind) => ({ kind, rows: hoursOfKind(entrance, kind) })).filter(({ rows }) => rows.length > 0)
  const badge = entranceOpenBadge(entrance, clock)

  return (
    <View style={styles.card} testID={`station-entrance-${entrance.id}`}>
      <View style={styles.header}>
        <Text style={styles.name}>{entrance.name}</Text>
        {badge && <OpenBadgeLabel badge={badge} />}
      </View>
      {entrance.address && entrance.address !== entrance.name && (
        <Text style={styles.address} preset="small">
          {entrance.address}
        </Text>
      )}
      {kinds.map(({ kind, rows }) => (
        <View key={kind} style={styles.hoursRow}>
          <Text style={styles.kind} preset="small">
            {translate(`serviceStatus.station.${kind === "entrance" ? "entranceHours" : kind}`)}
          </Text>
          <View style={styles.hours}>
            {rows.map((row, index) => (
              <View key={index} style={styles.hoursLine}>
                <Text style={styles.days} preset="small">
                  {dayRangeLabel(row.days, dayName)}
                </Text>
                <Text style={[styles.time, row.closed && styles.timeClosed]} preset="small">
                  {hoursLabel(row)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {entrance.inactiveElevators && (
        <Text style={styles.elevators} preset="small">
          {translate("serviceStatus.station.elevatorsOut")}: {entrance.inactiveElevators}
        </Text>
      )}
      {entrance.services.length > 0 && (
        <View style={styles.services}>
          {entrance.services.map((service) => (
            <View key={service} style={styles.service}>
              <Text style={styles.serviceText} preset="small" maxFontSizeMultiplier={1.2}>
                {service}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

/** Open (green), closing soon (orange) or closed (red), as a dot and a word. */
function OpenBadgeLabel({ badge }: { badge: OpenBadge }) {
  return (
    <View style={styles.badge} testID={`station-entrance-badge-${badge}`}>
      <View style={[styles.badgeDot, styles[`${badge}Dot`]]} />
      <Text style={[styles.badgeText, styles[`${badge}Text`]]} preset="small" numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {translate(BADGE_KEY[badge])}
      </Text>
    </View>
  )
}

const BADGE_KEY = {
  open: "serviceStatus.station.openNow",
  closingSoon: "serviceStatus.station.closingSoon",
  closed: "serviceStatus.station.closedNow",
} as const satisfies Record<OpenBadge, TxKeyPath>

/** "05:00–22:30" (kept left-to-right in a right-to-left sentence), "24 hours", or "Closed", with the page's note. */
export const hoursLabel = (row: StationHours): string => {
  const label = row.allDay
    ? (translate("serviceStatus.station.allDay") ?? "")
    : row.closed
      ? (translate("serviceStatus.station.closed") ?? "")
      : `⁦${row.opens}–${row.closes}⁩`
  return row.note ? `${label} · ${row.note}` : label
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
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontWeight: "600",
  },
  openDot: { backgroundColor: theme.colors.success },
  openText: { color: theme.colors.success },
  closingSoonDot: { backgroundColor: theme.colors.palette.orange },
  closingSoonText: { color: theme.colors.palette.orange },
  closedDot: { backgroundColor: theme.colors.destroy },
  closedText: { color: theme.colors.destroy },
  address: {
    marginTop: -theme.spacing[2],
    color: theme.colors.label,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  kind: {
    width: 96,
    fontWeight: "600",
    color: theme.colors.label,
  },
  hours: {
    flex: 1,
    gap: 2,
  },
  hoursLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[2],
  },
  days: {
    flexShrink: 1,
  },
  time: {
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  timeClosed: {
    color: theme.colors.label,
  },
  elevators: {
    color: theme.colors.error,
  },
  services: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  service: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 30,
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  serviceText: {
    fontSize: 13,
  },
}))
