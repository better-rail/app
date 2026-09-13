import { ActivityIndicator, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { getRailLine } from "@/data/rail-lines"
import type { DayType } from "@/data/rail-map-layout"
import type { LineStatus } from "@/services/api"
import { DisruptionCard } from "./disruption-card"
import { LineStations } from "./line-stations"
import { StatusError } from "./status-error"
import { levelDescription } from "../service-status-text"
import { tinted, useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

type LineDetailsProps = {
  lineId: string
  /** The timetable the map shows: where the line calls. */
  dayType: DayType
  onSelectStation: (stationId: string) => void
}

/** What is wrong on a line, or that nothing is, and then its stations. */
export function LineDetails({ lineId, dayType, onSelectStation }: LineDetailsProps) {
  const { data, isLoading, isError, refetch } = useServiceStatus()
  const status = data?.lines.find((l) => l.lineId === lineId)
  const line = getRailLine(lineId)

  return (
    <View style={styles.details} testID="line-status-details">
      {isLoading && !data && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {isError && !data && <StatusError onRetry={() => refetch()} />}
      {status && status.disruptions.length > 0 && status.disruptions.map((d) => <DisruptionCard key={d.id} disruption={d} />)}
      {status && status.disruptions.length === 0 && <StatusSummary status={status} />}

      {line && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} tx="serviceStatus.lineStations" />
          <LineStations line={line} status={status} dayType={dayType} onSelectStation={onSelectStation} />
        </View>
      )}
    </View>
  )
}

/** Nothing wrong on the line: how it is running, in a sentence, and how many trains are out. */
function StatusSummary({ status }: { status: LineStatus }) {
  const levelColor = useStatusLevelColor(status.level)
  const good = status.level === "goodService"

  return (
    <View style={styles.card} testID="line-status-summary">
      <View style={[styles.badge, { backgroundColor: tinted(levelColor) }]}>
        {good ? (
          <Image source={CHECKMARK_ICON} style={[styles.check, { tintColor: levelColor }]} />
        ) : (
          <View style={[styles.dot, { backgroundColor: levelColor }]} />
        )}
      </View>
      <View style={styles.texts}>
        <Text style={styles.description}>{levelDescription(status.level)}</Text>
        {status.trains.active > 0 && (
          <Text style={styles.counts} preset="small">
            {translate("serviceStatus.trainsActive", { count: status.trains.active })}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  details: {
    gap: theme.spacing[5],
  },
  loader: {
    marginTop: theme.spacing[4],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: theme.colors.tertiaryBackground,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 18,
    height: 18,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
  },
  counts: {
    color: theme.colors.label,
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
}))
