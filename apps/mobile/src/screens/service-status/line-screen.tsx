import { useMemo } from "react"
import { ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import { getRailLine } from "@/data/rail-lines"
import { LineDetails } from "./components/line-details"
import { dayTypeForLine } from "./day-type"
import { levelLabel, lineName } from "./service-status-text"
import { contrastText } from "./service-status-theme"
import { useServiceStatus } from "./use-service-status"

/** A line's status: a band in its colour with its name and level, what is wrong on it (and where, on the map), and its stations. */
export function LineScreen() {
  const { lineId } = useLocalSearchParams<{ lineId?: string }>()
  const router = useRouter()
  const { data, isLoading } = useServiceStatus()
  const line = lineId ? getRailLine(lineId) : undefined
  const status = lineId ? data?.lines.find((l) => l.lineId === lineId) : undefined
  // The timetable the line's stations are listed from: today's, unless the line does not run today.
  const dayType = useMemo(() => (lineId ? dayTypeForLine(lineId) : undefined), [lineId])

  if (!lineId || !dayType) return <Redirect href="/service-status" />

  const title = line?.name[userLocale] ?? (status ? lineName(status) : "")
  const bandColor = line?.color ?? status?.line.color ?? "#8E8E93"
  const bandText = line?.textColor ?? contrastText(bandColor)

  const selectStation = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_station_pressed", { stationId, source: "line" })
    router.push({ pathname: "/service-status/station", params: { stationId } })
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      testID="line-status-screen"
    >
      <View style={[styles.band, { backgroundColor: bandColor }]} accessibilityRole="header" testID="line-status-header">
        <Text style={[styles.bandTitle, { color: bandText }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.bandLevel, { color: bandText }]}>
          {status ? levelLabel(status.level) : isLoading ? "…" : (translate("serviceStatus.levels.unknown") ?? "")}
        </Text>
      </View>
      <LineDetails lineId={lineId} dayType={dayType} onSelectStation={selectStation} />
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: rt.insets.bottom + theme.spacing[5],
    gap: theme.spacing[5],
  },
  band: {
    padding: theme.spacing[4],
    borderRadius: 14,
    borderCurve: "continuous",
    gap: 2,
  },
  bandTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  bandLevel: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.9,
  },
}))
