import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { AffectedTrain, Disruption } from "@/services/api"
import { clockTime, disruptionSummary, disruptionTitle, levelLabel, stationName, trainConsequence } from "../service-status-text"
import { useStatusLevelColor } from "../service-status-theme"

const MAX_TRAINS_SHOWN = 12

type DisruptionCardProps = {
  disruption: Disruption
}

/** What is wrong on a line: the stretch affected and the trains it concerns. */
export function DisruptionCard({ disruption }: DisruptionCardProps) {
  const levelColor = useStatusLevelColor(disruption.level)
  const summary = disruptionSummary(disruption)
  const trains = disruption.trains.slice(0, MAX_TRAINS_SHOWN)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={styles.title}>{disruptionTitle(disruption)}</Text>
        <Text style={[styles.levelText, { color: levelColor }]}>{levelLabel(disruption.level)}</Text>
      </View>
      {summary && <Text style={styles.summary}>{summary}</Text>}
      {trains.map((train) => (
        <TrainRow key={`${train.trainNumber}-${train.departureTime}`} train={train} />
      ))}
      {disruption.trains.length > trains.length && (
        <Text style={styles.more} preset="small">
          +{disruption.trains.length - trains.length}
        </Text>
      )}
    </View>
  )
}

function TrainRow({ train }: { train: AffectedTrain }) {
  const origin = stationName(train.originStationId)
  const destination = stationName(train.destinationStationId)
  return (
    <View style={styles.train}>
      <View style={styles.trainNumber}>
        <Text style={styles.trainNumberText} maxFontSizeMultiplier={1.1}>
          {train.trainNumber}
        </Text>
      </View>
      <View style={styles.trainTexts}>
        <Text style={styles.trainRoute} numberOfLines={2}>
          {translate("serviceStatus.trainRoute", { origin, destination })}
        </Text>
        <Text style={styles.trainMeta} preset="small">
          {translate("serviceStatus.departsAt", { time: clockTime(train.departureTime) })}
          {train.nextStationId && train.status !== "cancelled"
            ? ` · ${translate("serviceStatus.nextStation", { station: stationName(train.nextStationId) })}`
            : ""}
        </Text>
      </View>
      <Text style={[styles.consequence, train.status === "cancelled" && styles.cancelled]} preset="small">
        {trainConsequence(train)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: 14,
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  levelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summary: {
    fontSize: 15,
    color: theme.colors.label,
  },
  train: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  trainNumber: {
    minWidth: 44,
    paddingHorizontal: theme.spacing[1],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.inputPlaceholderBackground,
    alignItems: "center",
  },
  trainNumberText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  trainTexts: {
    flex: 1,
    gap: 1,
  },
  trainRoute: {
    fontSize: 15,
  },
  trainMeta: {
    color: theme.colors.label,
  },
  consequence: {
    fontWeight: "600",
    textAlign: "right",
    maxWidth: 110,
  },
  cancelled: {
    color: theme.colors.error,
  },
  more: {
    color: theme.colors.label,
    textAlign: "center",
  },
}))
