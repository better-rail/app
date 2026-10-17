import { TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Path, Svg } from "react-native-svg"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { useIsDarkMode } from "@/hooks"
import type { AffectedTrain, Disruption, TravelAlternative } from "@/services/api"
import { openLink } from "@/utils/helpers/open-link"
import {
  disruptionReason,
  disruptionSummary,
  disruptionTitle,
  disruptionUntil,
  levelLabel,
  localizedText,
  stationName,
  trainConsequence,
} from "../service-status-text"
import { useStatusLevelColor, useStatusLevelInk } from "../service-status-theme"

const MAX_TRAINS_SHOWN = 12

type DisruptionCardProps = {
  disruption: Disruption
}

/**
 * One thing wrong on a line, laid out to be scanned: what and where, why and until when on one
 * quiet line, then the ways around it and the trains it concerns as two inset blocks of their own,
 * each alternative with an icon for its kind. Nothing is folded away.
 */
export function DisruptionCard({ disruption }: DisruptionCardProps) {
  const levelColor = useStatusLevelColor(disruption.level)
  const summary = disruptionSummary(disruption)
  const reason = disruptionReason(disruption)
  const until = disruptionUntil(disruption)
  const alternatives = disruption.alternatives ?? []
  const trains = disruption.trains.slice(0, MAX_TRAINS_SHOWN)
  // Where it came from and until when, as one line: "Until Mon 19 Oct 16:39 · Announced by Israel Railways".
  const meta = [
    until,
    disruption.source === "announcement"
      ? translate("serviceStatus.announced")
      : disruption.source === "timetable"
        ? translate("serviceStatus.fromTimetable")
        : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <View style={styles.card} testID={`disruption-${disruption.id}`}>
      <View
        style={styles.header}
        accessible
        accessibilityLabel={`${disruptionTitle(disruption)}, ${levelLabel(disruption.level)}`}
      >
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={styles.title}>{disruptionTitle(disruption)}</Text>
      </View>
      {summary && <Text style={styles.summary}>{summary}</Text>}
      {reason && (
        <Text style={styles.reason} preset="small">
          {reason}
        </Text>
      )}
      {meta !== "" && (
        <Text style={styles.meta} preset="small">
          {meta}
        </Text>
      )}

      {alternatives.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle} preset="small" tx="serviceStatus.alternatives" />
          {alternatives.map((alternative, index) => (
            <AlternativeRow key={index} alternative={alternative} />
          ))}
        </View>
      )}

      {trains.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle} preset="small">
            {disruption.trains.length === 1
              ? translate("serviceStatus.affectedTrain")
              : translate("serviceStatus.affectedTrains", { count: disruption.trains.length })}
          </Text>
          {trains.map((train) => (
            <TrainRow key={`${train.trainNumber}-${train.departureTime}`} train={train} />
          ))}
          {disruption.trains.length > trains.length && (
            <Text style={styles.more} preset="small">
              +{disruption.trains.length - trains.length}
            </Text>
          )}
        </View>
      )}

      {disruption.link && (
        <TouchableOpacity
          onPress={() => openLink(disruption.link as string)}
          accessibilityRole="link"
          style={styles.link}
          testID="disruption-link"
        >
          <Text style={styles.linkText} preset="small" tx="serviceStatus.moreInfo" />
        </TouchableOpacity>
      )}
    </View>
  )
}

/**
 * One way around the disruption: an icon for its kind, the kind in bold with a green "free" tag
 * when it costs nothing, and what Israel Railways said about it underneath.
 */
function AlternativeRow({ alternative }: { alternative: TravelAlternative }) {
  const freeInk = useStatusLevelInk("goodService")
  return (
    <View style={styles.alternative}>
      <View style={styles.iconDisc}>
        <ModeIcon mode={alternative.mode} />
      </View>
      <View style={styles.alternativeTexts}>
        <View style={styles.alternativeHeader}>
          <Text style={styles.alternativeMode} preset="small">
            {translate(`serviceStatus.modes.${alternative.mode}`) ?? alternative.mode}
          </Text>
          {alternative.free && <Text style={[styles.free, { color: freeInk }]} preset="small" tx="serviceStatus.free" />}
        </View>
        <Text style={styles.alternativeText} preset="small">
          {localizedText(alternative.description)}
        </Text>
      </View>
    </View>
  )
}

/** A bus for the road alternatives, a train for the rail ones, in the app's blue. */
function ModeIcon({ mode }: { mode: TravelAlternative["mode"] }) {
  const isDark = useIsDarkMode()
  const fill = isDark ? "#0A84FF" : "#007AFF"
  const rail = mode === "train" || mode === "lightRail"
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={
          rail
            ? "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z"
            : "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"
        }
        fill={fill}
      />
    </Svg>
  )
}

/** A train by its number on a tag, where it is heading, and under that what has become of it. */
function TrainRow({ train }: { train: AffectedTrain }) {
  return (
    <View style={styles.train}>
      <View style={styles.trainNumber}>
        <Text style={styles.trainNumberText} preset="small" maxFontSizeMultiplier={1.1}>
          {train.trainNumber}
        </Text>
      </View>
      <View style={styles.trainTexts}>
        <Text style={styles.trainRoute} preset="small">
          {stationName(train.destinationStationId)}
        </Text>
        <Text style={[styles.consequence, train.status === "cancelled" && styles.cancelled]} preset="small">
          {trainConsequence(train)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: theme.spacing[4],
    gap: theme.spacing[1],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginBottom: 2,
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
  },
  reason: {
    color: theme.colors.label,
  },
  meta: {
    color: theme.colors.label,
  },
  // The alternatives and the trains each stand on a block of their own, in the screen's grey against the card's white.
  block: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: theme.colors.background,
    gap: theme.spacing[2],
  },
  blockTitle: {
    fontWeight: "600",
    color: theme.colors.label,
  },
  alternative: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[2],
  },
  iconDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 132, 255, 0.14)",
  },
  alternativeTexts: {
    flex: 1,
    gap: 1,
  },
  alternativeHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[2],
  },
  alternativeMode: {
    fontWeight: "600",
  },
  free: {
    fontWeight: "600",
  },
  alternativeText: {
    color: theme.colors.label,
  },
  train: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[2],
  },
  trainTexts: {
    flex: 1,
    gap: 1,
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
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  trainRoute: {
    fontWeight: "500",
  },
  consequence: {
    color: theme.colors.label,
  },
  cancelled: {
    color: theme.colors.error,
  },
  more: {
    color: theme.colors.label,
  },
  link: {
    marginTop: theme.spacing[2],
  },
  linkText: {
    fontWeight: "600",
    color: theme.colors.link,
  },
}))
