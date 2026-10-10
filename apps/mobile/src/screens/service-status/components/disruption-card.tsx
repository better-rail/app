import { TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import type { AffectedTrain, Disruption, TravelAlternative } from "@/services/api"
import { openLink } from "@/utils/helpers/open-link"
import {
  alternativeLabel,
  disruptionReason,
  disruptionSummary,
  disruptionTitle,
  disruptionUntil,
  localizedText,
  stationName,
  trainConsequence,
} from "../service-status-text"
import { useStatusLevelColor } from "../service-status-theme"

const MAX_TRAINS_SHOWN = 12

type DisruptionCardProps = {
  disruption: Disruption
}

/**
 * One thing wrong on a line: the stretch affected, why (when Israel Railways said), how to get
 * around it (when it offered a way), and the trains it concerns, kept to the essentials.
 */
export function DisruptionCard({ disruption }: DisruptionCardProps) {
  const levelColor = useStatusLevelColor(disruption.level)
  const summary = disruptionSummary(disruption)
  const reason = disruptionReason(disruption)
  const until = disruptionUntil(disruption)
  const alternatives = disruption.alternatives ?? []
  const trains = disruption.trains.slice(0, MAX_TRAINS_SHOWN)

  return (
    <View style={styles.card} testID={`disruption-${disruption.id}`}>
      <View style={styles.header}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={styles.title}>{disruptionTitle(disruption)}</Text>
      </View>
      {summary && <Text style={styles.summary}>{summary}</Text>}
      {reason && <Text style={styles.reason}>{reason}</Text>}
      {until && (
        <Text style={styles.until} preset="small">
          {until}
        </Text>
      )}
      {disruption.source === "announcement" && <Text style={styles.source} preset="small" tx="serviceStatus.announced" />}
      {disruption.source === "timetable" && <Text style={styles.source} preset="small" tx="serviceStatus.fromTimetable" />}
      {alternatives.length > 0 && (
        <View style={styles.alternatives}>
          <Text style={styles.alternativesTitle} preset="small" tx="serviceStatus.alternatives" />
          {alternatives.map((alternative, index) => (
            <AlternativeRow key={index} alternative={alternative} />
          ))}
        </View>
      )}
      {trains.map((train) => (
        <TrainRow key={`${train.trainNumber}-${train.departureTime}`} train={train} />
      ))}
      {disruption.trains.length > trains.length && (
        <Text style={styles.more} preset="small">
          +{disruption.trains.length - trains.length}
        </Text>
      )}
      {disruption.link && (
        <TouchableOpacity
          onPress={() => openLink(disruption.link as string)}
          accessibilityRole="link"
          style={styles.link}
          testID="disruption-link"
        >
          <Text style={styles.linkText} tx="serviceStatus.moreInfo" />
        </TouchableOpacity>
      )}
    </View>
  )
}

/** One way around the disruption: what kind, and what Israel Railways said about it. */
function AlternativeRow({ alternative }: { alternative: TravelAlternative }) {
  return (
    <View style={styles.alternative}>
      <Text style={styles.alternativeMode}>{alternativeLabel(alternative)}</Text>
      <Text style={styles.alternativeText}>{localizedText(alternative.description)}</Text>
    </View>
  )
}

/** A train by where it is heading, as a departure board would put it, and what has become of it. */
function TrainRow({ train }: { train: AffectedTrain }) {
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
          {destination}
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
  summary: {
    fontSize: 15,
    color: theme.colors.label,
  },
  reason: {
    fontSize: 15,
  },
  until: {
    color: theme.colors.label,
  },
  source: {
    color: theme.colors.label,
  },
  alternatives: {
    gap: theme.spacing[2],
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  alternativesTitle: {
    fontWeight: "600",
    color: theme.colors.label,
  },
  alternative: {
    gap: 1,
  },
  alternativeMode: {
    fontSize: 15,
    fontWeight: "600",
  },
  alternativeText: {
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
    fontWeight: "500",
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
  link: {
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.link,
  },
}))
