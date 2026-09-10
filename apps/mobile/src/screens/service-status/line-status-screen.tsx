import { ActivityIndicator, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Stack, useLocalSearchParams } from "expo-router"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { RailMap, currentDayType } from "@/components/rail-map"
import { getRailLine, type RailLineId } from "@/data/rail-lines"
import { SERVICE_PATTERNS } from "@/data/rail-map-layout"
import { MINOR_DELAY_MINUTES, SEVERE_DELAY_MINUTES } from "@/services/api"
import { DisruptionCard } from "./components/disruption-card"
import { LineBadge } from "./components/line-badge"
import { LiveIndicator } from "./components/live-indicator"
import { StatusError } from "./components/status-error"
import { levelDescription, levelLabel, lineName } from "./service-status-text"
import { contrastText } from "./service-status-theme"
import { useServiceStatus } from "./use-service-status"

/** A line's map, with everything else greyed out, and the sheet of what is wrong on it. */
export function LineStatusScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>()
  const { data, isLoading, isError, refetch } = useServiceStatus()
  const line = getRailLine(lineId)
  const status = data?.lines.find((l) => l.lineId === lineId)
  const bandColor = line?.color ?? status?.line.color ?? "#8E8E93"
  const bandText = line?.textColor ?? contrastText(bandColor)
  const title = line?.name[userLocale] ?? (status ? lineName(status) : "")
  // Today's map, unless the line only runs on the other kind of day.
  const today = currentDayType()
  const dayType = SERVICE_PATTERNS[today].lines.includes(lineId as RailLineId)
    ? today
    : today === "weekday"
      ? "weekend"
      : "weekday"

  return (
    <View style={styles.root} testID="line-status-screen">
      <Stack.Screen options={{ title }} />
      <RailMap
        status={data}
        dayType={dayType}
        selectedLineId={(lineId as RailLineId) ?? null}
        focusLineId={(lineId as RailLineId) ?? null}
        style={styles.map}
      />

      <View style={styles.sheet}>
        <View style={[styles.band, { backgroundColor: bandColor }]}>
          {line && <LineBadge line={{ ...line, color: bandText, textColor: bandColor, badgeStyle: "solid" }} size={40} />}
          <View style={styles.bandTexts}>
            <Text style={[styles.bandTitle, { color: bandText }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.bandLevel, { color: bandText }]}>
              {status ? levelLabel(status.level) : isLoading ? "…" : (translate("serviceStatus.levels.unknown") ?? "")}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.sheetContent}>
          {isLoading && !data && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
          {isError && !data && <StatusError onRetry={() => refetch()} />}
          {data && status && (
            <>
              <Text style={styles.description}>{levelDescription(status.level)}</Text>
              {status.trains.active > 0 && (
                <Text style={styles.counts} preset="small">
                  {translate("serviceStatus.trainsActive", { count: status.trains.active })}
                  {status.trains.delayed > 0
                    ? ` · ${translate("serviceStatus.trainsDelayed", { count: status.trains.delayed })}`
                    : ""}
                  {status.trains.cancelled > 0
                    ? ` · ${translate("serviceStatus.trainsCancelled", { count: status.trains.cancelled })}`
                    : ""}
                </Text>
              )}
              {status.disruptions.map((disruption) => (
                <DisruptionCard key={disruption.id} disruption={disruption} />
              ))}
              <LiveIndicator realtime={data.realtime} compact />
              <Text style={styles.thresholds} preset="small">
                {translate("serviceStatus.thresholds", { minor: MINOR_DELAY_MINUTES, severe: SEVERE_DELAY_MINUTES })}
              </Text>
              <Text style={styles.thresholds} tx="serviceStatus.mapCredit" preset="secondary" />
            </>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1.15,
  },
  sheet: {
    flex: 1,
    borderTopStartRadius: 22,
    borderTopEndRadius: 22,
    marginTop: -22,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  bandTexts: {
    flex: 1,
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
  sheetContent: {
    padding: theme.spacing[4],
    paddingBottom: rt.insets.bottom + theme.spacing[5],
    gap: theme.spacing[3],
  },
  loader: {
    marginTop: theme.spacing[4],
  },
  description: {
    fontSize: 16,
  },
  counts: {
    color: theme.colors.label,
  },
  thresholds: {
    color: theme.colors.dim,
  },
}))
