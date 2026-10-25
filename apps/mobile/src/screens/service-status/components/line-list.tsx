import { useState } from "react"
import { ActivityIndicator, I18nManager, Image, LayoutAnimation, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNetworkState } from "expo-network"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { color } from "@/theme"
import {
  compareServiceStatusLevels,
  isDisruptedLevel,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
} from "@/services/api"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { LineStatusRow } from "./line-status-row"
import { StatusError } from "./status-error"
import { levelLabel } from "../service-status-text"
import { tinted, useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

/**
 * Levels summed up in one band under the disrupted lines' rows, without naming the lines. Lines with
 * no trains scheduled right now are not a disruption, so they are left out.
 */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "unknown"]

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")
const CLOCK_ICON = require("../../../../assets/clock-ios.png")
const CHEVRON_ICON = require("../../../../assets/chevron.png")

type LineListProps = {
  /** The rider's own lines (the route planned, the favourites), brought up first in this order. */
  userLineIds: string[]
  onSelectLine: (lineId: string) => void
}

/**
 * Every line's status in grouped cards: a headline card for the whole network, the rider's own lines
 * first, then the disrupted ones, worst first, and one row saying the rest run well, without naming them.
 * Under the rider's own lines the others fold away, in a card that opens on a tap.
 */
export function LineList({ userLineIds, onSelectLine }: LineListProps) {
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, refetch } = useServiceStatus()

  const lines = data?.lines ?? []
  const mine = userLineIds.map((id) => lines.find((l) => l.lineId === id)).filter((l): l is LineStatus => !!l)
  const others = lines.filter((l) => !userLineIds.includes(l.lineId))
  const disrupted = others.filter((l) => isDisruptedLevel(l.level)).sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  // With none of the rider's lines and nothing disrupted, the headline already says every line is fine.
  const showRestGood = others.some((l) => l.level === "goodService") && (disrupted.length > 0 || mine.length > 0)
  // Nothing runs right now (the small hours, the weekend): say so, instead of an empty list.
  const nothingRunning = data !== undefined && !lines.some((l) => isDisruptedLevel(l.level) || GROUPED_LEVELS.includes(l.level))

  return (
    <View style={styles.list} testID="service-status-list">
      {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
      {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

      {data && <NetworkHeadline snapshot={data} nothingRunning={nothingRunning} />}

      {mine.length > 0 && (
        <Section title={translate("serviceStatus.yourLines") ?? ""} testID="service-status-user-lines">
          {mine.map((line, index) => (
            <LineStatusRow
              key={line.lineId}
              status={line}
              compact={line.level === "unknown"}
              last={index === mine.length - 1}
              onPress={() => onSelectLine(line.lineId)}
            />
          ))}
        </Section>
      )}

      {(disrupted.length > 0 || showRestGood) &&
        (mine.length > 0 ? (
          <OtherLines disrupted={disrupted} showRestGood={showRestGood} onSelectLine={onSelectLine} />
        ) : (
          <Section title={translate("serviceStatus.allLines") ?? ""}>
            <OtherLineRows disrupted={disrupted} showRestGood={showRestGood} onSelectLine={onSelectLine} />
          </Section>
        ))}
    </View>
  )
}

/** A heading over a rounded card of rows, as iOS groups a settings list. */
function Section({ title, testID, children }: { title: string; testID?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  )
}

type OtherLinesProps = {
  disrupted: LineStatus[]
  showRestGood: boolean
  onSelectLine: (lineId: string) => void
}

/** The disrupted lines, worst first, and the row for those running well. */
function OtherLineRows({ disrupted, showRestGood, onSelectLine }: OtherLinesProps) {
  return (
    <>
      {disrupted.map((line, index) => (
        <LineStatusRow
          key={line.lineId}
          status={line}
          last={!showRestGood && index === disrupted.length - 1}
          onPress={() => onSelectLine(line.lineId)}
        />
      ))}
      {showRestGood && <RestGoodRow />}
    </>
  )
}

/**
 * The lines other than the rider's, folded into one row that says how many are disrupted; a tap
 * opens the card on their rows, as a disclosure group in iOS's settings.
 */
function OtherLines(props: OtherLinesProps) {
  const [open, setOpen] = useState(false)
  const { disrupted } = props
  const summary =
    disrupted.length === 0
      ? translate("serviceStatus.restGood")
      : disrupted.length === 1
        ? translate("serviceStatus.disruptedLine")
        : translate("serviceStatus.disruptedLines", { count: disrupted.length })
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"))
    setOpen((value) => !value)
  }
  // The chevron points to the row's trailing side while folded, and down while open.
  const rotation = open ? "-90deg" : I18nManager.isRTL ? "0deg" : "180deg"
  return (
    <View style={styles.card} testID="service-status-other-lines">
      <TouchableHighlight
        underlayColor={color.inputPlaceholderBackground}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="service-status-other-lines-toggle"
      >
        <View style={[styles.disclosure, open && styles.disclosureOpen]}>
          <View style={styles.disclosureTexts}>
            <Text style={styles.disclosureTitle}>{translate("serviceStatus.otherLines")}</Text>
            <Text style={styles.disclosureSummary}>{summary}</Text>
          </View>
          <Image source={CHEVRON_ICON} style={[styles.chevron, { transform: [{ rotate: rotation }] }]} />
        </View>
      </TouchableHighlight>
      {open && <OtherLineRows {...props} />}
    </View>
  )
}

/** The lines running well, summed up in one row instead of listed. */
function RestGoodRow() {
  const goodColor = useStatusLevelColor("goodService")
  return (
    <View style={styles.restGood} testID="service-status-rest-good">
      <Image source={CHECKMARK_ICON} style={[styles.restGoodIcon, { tintColor: goodColor }]} />
      <Text style={styles.restGoodText}>{translate("serviceStatus.restGood")}</Text>
    </View>
  )
}

/** "212 trains running", when any are. */
const activeTrains = (lines: LineStatus[]): string | undefined => {
  const count = lines.reduce((sum, line) => sum + line.trains.active, 0)
  return count > 0 ? (translate("serviceStatus.trainsActive", { count }) ?? undefined) : undefined
}

type NetworkHeadlineProps = {
  snapshot: ServiceStatusSnapshot
  nothingRunning: boolean
}

/**
 * The whole network in a line: that all is well, how many lines are disrupted, or that nothing runs
 * right now, with how live the data is.
 */
function NetworkHeadline({ snapshot, nothingRunning }: NetworkHeadlineProps) {
  const disruptedCount = snapshot.lines.filter((l) => isDisruptedLevel(l.level)).length
  const allGood = snapshot.lines.length > 0 && snapshot.lines.every((l) => l.level === "goodService" || l.level === "noService")
  if (nothingRunning) {
    return (
      <NetworkSummary
        level="noService"
        title={levelLabel("noService")}
        detail={translate("serviceStatus.noServiceNow") ?? undefined}
        realtime={snapshot.realtime}
      />
    )
  }
  if (disruptedCount > 0) {
    return (
      <NetworkSummary
        level={snapshot.network.level}
        title={
          (disruptedCount === 1
            ? translate("serviceStatus.disruptedLine")
            : translate("serviceStatus.disruptedLines", { count: disruptedCount })) ?? ""
        }
        detail={activeTrains(snapshot.lines)}
        realtime={snapshot.realtime}
      />
    )
  }
  return (
    <NetworkSummary
      level={allGood ? "goodService" : "unknown"}
      title={allGood ? (translate("serviceStatus.allLinesGood") ?? "") : levelLabel("unknown")}
      detail={activeTrains(snapshot.lines)}
      realtime={snapshot.realtime}
    />
  )
}

type NetworkSummaryProps = {
  level: ServiceStatusLevel
  title: string
  detail?: string
  realtime: ServiceStatusSnapshot["realtime"]
}

/**
 * The headline card: a check, an exclamation mark when lines are disrupted, or a clock when only the
 * timetable is known, in the level's colour; a few words, the trains running, and how live that is.
 */
function NetworkSummary({ level, title, detail, realtime }: NetworkSummaryProps) {
  const levelColor = useStatusLevelColor(level)
  const liveColor = useStatusLevelColor("goodService")
  // With no live data the title already says so; the line under it says where the numbers come from.
  const source = realtime.available
    ? translate("serviceStatus.live")
    : level === "unknown"
      ? translate("serviceStatus.fromTimetable")
      : translate("serviceStatus.liveUnavailable")
  return (
    <View style={[styles.card, styles.summary]} testID={`service-status-summary-${level}`}>
      <View style={[styles.summaryBadge, { backgroundColor: tinted(levelColor) }]}>
        {level === "goodService" ? (
          <Image source={CHECKMARK_ICON} style={[styles.summaryIcon, { tintColor: levelColor }]} />
        ) : level === "unknown" ? (
          <Image source={CLOCK_ICON} style={[styles.summaryIcon, { tintColor: levelColor }]} />
        ) : (
          <Text style={[styles.summaryMark, { color: levelColor }]}>!</Text>
        )}
      </View>
      <View style={styles.summaryTexts}>
        <Text style={styles.summaryTitle}>{title}</Text>
        {detail && <Text style={styles.summaryDetail}>{detail}</Text>}
        <View style={styles.source}>
          {realtime.available && <View style={[styles.liveDot, { backgroundColor: liveColor }]} />}
          <Text style={styles.sourceText}>{source}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    gap: theme.spacing[5],
  },
  loader: {
    marginVertical: theme.spacing[5],
  },
  card: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  section: {
    gap: theme.spacing[2],
  },
  sectionTitle: {
    paddingHorizontal: theme.spacing[4],
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.label,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    minHeight: 50,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  disclosureOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  disclosureTexts: {
    flex: 1,
    gap: 2,
  },
  disclosureTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  disclosureSummary: {
    fontSize: 15,
    color: theme.colors.label,
  },
  chevron: {
    width: 8,
    height: 14,
    tintColor: theme.colors.label,
  },
  restGood: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    minHeight: 50,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  restGoodIcon: {
    width: 17,
    height: 17,
  },
  restGoodText: {
    flex: 1,
    fontSize: 17,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  summaryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIcon: {
    width: 22,
    height: 22,
  },
  summaryMark: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
  },
  summaryTexts: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryDetail: {
    fontSize: 15,
    color: theme.colors.text,
  },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceText: {
    flexShrink: 1,
    fontSize: 13,
    color: theme.colors.label,
  },
}))
