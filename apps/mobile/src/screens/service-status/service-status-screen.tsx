import { ActivityIndicator, Image, Platform, RefreshControl, ScrollView, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useNetworkState } from "expo-network"
import HapticFeedback from "react-native-haptic-feedback"
import { Screen, Text } from "@/components"
import { useIsDarkMode } from "@/hooks"
import { color } from "@/theme"
import { trackEvent } from "@/services/analytics"
import { compareServiceStatusLevels, isDisruptedLevel, type LineStatus, type ServiceStatusLevel } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { CHEVRON_ICON } from "@/screens/settings/components/settings-box"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { LineBadge } from "./components/line-badge"
import { LineStatusRow } from "./components/line-status-row"
import { LiveIndicator } from "./components/live-indicator"
import { StatusError } from "./components/status-error"
import { levelLabel, levelDescription } from "./service-status-text"
import { useStatusLevelColor } from "./service-status-theme"
import { useServiceStatus } from "./use-service-status"

const MAP_ICON = require("../../../assets/route.png")
const chevronIcon = require("../../../assets/chevron.png")

/** Lines that need a row of their own, worst first; the rest are grouped by level. */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "noService", "unknown"]

export function ServiceStatusScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, isFetching, refetch } = useServiceStatus()

  const openLine = (lineId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_line_pressed", { lineId })
    router.push({ pathname: "/service-status/[lineId]", params: { lineId } })
  }

  const openMap = () => {
    trackEvent("service_status_map_pressed")
    router.push("/service-status/map")
  }

  const disrupted = (data?.lines ?? [])
    .filter((l) => isDisruptedLevel(l.level))
    .sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const grouped = GROUPED_LEVELS.map((level) => ({ level, lines: (data?.lines ?? []).filter((l) => l.level === level) })).filter(
    (group) => group.lines.length > 0,
  )

  return (
    <Screen
      testID="service-status-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} />}
      >
        <TouchableHighlight
          underlayColor={color.inputPlaceholderBackground}
          onPress={openMap}
          style={styles.mapCard}
          testID="service-status-map"
        >
          <View style={styles.mapCardInner}>
            <Image source={MAP_ICON} style={styles.mapIcon} />
            <View style={styles.mapTexts}>
              <Text style={styles.mapTitle} tx="serviceStatus.networkMap" />
              <Text style={styles.mapHint} tx="serviceStatus.networkMapHint" preset="small" />
            </View>
            <Image source={chevronIcon} style={CHEVRON_ICON} />
          </View>
        </TouchableHighlight>

        {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
        {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
        {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

        {data && (
          <>
            <LiveIndicator realtime={data.realtime} />

            {disrupted.length > 0 && (
              <View style={styles.group}>
                {disrupted.map((line, index) => (
                  <LineStatusRow
                    key={line.lineId}
                    status={line}
                    first={index === 0}
                    last={index === disrupted.length - 1}
                    onPress={() => openLine(line.lineId)}
                  />
                ))}
              </View>
            )}

            {grouped.map((group) => (
              <LevelGroup
                key={group.level}
                level={group.level}
                lines={group.lines}
                onlyGroup={disrupted.length === 0 && grouped.length === 1}
                onPressLine={openLine}
              />
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

type LevelGroupProps = {
  level: ServiceStatusLevel
  lines: LineStatus[]
  /** Every line shares this level, so it is the whole network's headline. */
  onlyGroup: boolean
  onPressLine: (lineId: string) => void
}

/** TfL's "Other lines — Good service" band: one level, every line's badge. */
function LevelGroup({ level, lines, onlyGroup, onPressLine }: LevelGroupProps) {
  const levelColor = useStatusLevelColor(level)
  return (
    <View style={styles.levelGroup} testID={`service-status-group-${level}`}>
      <Text style={styles.levelGroupTitle} tx={onlyGroup ? "serviceStatus.allLines" : "serviceStatus.otherLines"} />
      <Text style={[styles.levelGroupLevel, { color: levelColor }]}>{levelLabel(level)}</Text>
      <Text style={styles.levelGroupDescription} preset="small">
        {levelDescription(level)}
      </Text>
      <View style={styles.badges}>
        {lines.map((line) => {
          const catalogue = getRailLine(line.lineId) ?? { ...line.line, badgeStyle: "solid" as const, textColor: undefined }
          return (
            <TouchableHighlight
              key={line.lineId}
              underlayColor={color.inputPlaceholderBackground}
              onPress={() => onPressLine(line.lineId)}
              style={styles.badgeTouchable}
              testID={`service-status-line-${line.lineId}`}
              accessibilityRole="button"
              accessibilityLabel={getRailLine(line.lineId)?.name.en ?? line.line.name.en}
            >
              <LineBadge line={catalogue} size={36} />
            </TouchableHighlight>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[7],
    gap: theme.spacing[4],
  },
  mapCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.tertiaryBackground,
  },
  mapCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  mapIcon: {
    width: 26,
    height: 26,
    tintColor: theme.colors.primary,
  },
  mapTexts: {
    flex: 1,
    gap: 2,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  mapHint: {
    color: theme.colors.label,
  },
  loader: {
    marginTop: theme.spacing[6],
  },
  group: {
    borderRadius: 14,
    overflow: "hidden",
  },
  levelGroup: {
    borderRadius: 14,
    backgroundColor: theme.colors.tertiaryBackground,
    padding: theme.spacing[4],
    gap: 2,
  },
  levelGroupTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  levelGroupLevel: {
    fontSize: 15,
    fontWeight: "500",
  },
  levelGroupDescription: {
    color: theme.colors.label,
    marginBottom: theme.spacing[2],
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  badgeTouchable: {
    borderRadius: 10,
  },
}))
