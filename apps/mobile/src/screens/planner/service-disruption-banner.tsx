import { useMemo } from "react"
import { Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { useShallow } from "zustand/react/shallow"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { trackEvent } from "@/services/analytics"
import { getRailLine } from "@/data/rail-lines"
import { useFavoritesStore, useRoutePlanStore } from "@/models"
import { disruptionSummary, disruptionTitle, levelLabel, lineName } from "@/screens/service-status/service-status-text"
import { useStatusLevelColor } from "@/screens/service-status/service-status-theme"
import { useServiceStatus } from "@/screens/service-status/use-service-status"
import { userDisruptions, userRoutes } from "@/screens/service-status/user-lines"

/**
 * A word on the home screen when something is wrong on a line the rider travels (the route being
 * planned, a favourite): the worst of it, with the line's colour down its edge. Tap it for the
 * line's status, where the disruption is pictured on the map. Nothing when all is well.
 */
export function ServiceDisruptionBanner() {
  const router = useRouter()
  const { data } = useServiceStatus({ background: true })
  const { origin, destination } = useRoutePlanStore(useShallow((s) => ({ origin: s.origin, destination: s.destination })))
  const favorites = useFavoritesStore((s) => s.routes)
  const found = useMemo(
    () => userDisruptions(data, userRoutes({ origin, destination }, favorites)),
    // The stations, not the station objects: the plan store makes new ones on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, origin?.id, destination?.id, favorites],
  )
  const first = found[0]
  const levelColor = useStatusLevelColor(first?.disruption.level ?? "unknown")
  if (!first) return null

  const { status, disruption } = first
  const lineColor = getRailLine(status.lineId)?.color ?? status.line.color
  const title = `${disruptionTitle(disruption)} · ${lineName(status)}`
  const summary = disruptionSummary(disruption) ?? levelLabel(disruption.level)
  const more = found.length - 1

  const open = () => {
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_banner_pressed", { lineId: status.lineId, disruptionId: disruption.id })
    router.push({ pathname: "/service-status/line", params: { lineId: status.lineId } })
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}`}
      accessibilityHint={translate("serviceStatus.lineDetails") ?? undefined}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      testID="service-disruption-banner"
    >
      <View style={[styles.bar, { backgroundColor: lineColor }]} />
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: levelColor }]} />
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
        </View>
        <Text style={styles.summary} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {summary}
        </Text>
        {more > 0 && (
          <Text style={styles.more} preset="small" maxFontSizeMultiplier={1.3}>
            {translate("serviceStatus.moreDisruptions", { count: more })}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: "row",
    marginBottom: theme.spacing[4],
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.secondaryBackground,
    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.dim,
    shadowRadius: 2,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  bar: {
    width: 6,
  },
  texts: {
    flex: 1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 15,
  },
  more: {
    color: theme.colors.label,
  },
}))
