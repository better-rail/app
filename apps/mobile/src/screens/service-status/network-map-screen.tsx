import { useState } from "react"
import { Image, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { color } from "@/theme"
import { trackEvent } from "@/services/analytics"
import { type DayType, RailMap, currentDayType } from "@/components/rail-map"
import { Chip } from "@/components"
import { getRailLine, type RailLineId } from "@/data/rail-lines"
import { CHEVRON_ICON } from "@/screens/settings/components/settings-box"
import { LineBadge } from "./components/line-badge"
import { LiveIndicator } from "./components/live-indicator"
import { levelLabel, lineName } from "./service-status-text"
import { useStatusLevelColor } from "./service-status-theme"
import { useServiceStatus } from "./use-service-status"

const chevronIcon = require("../../../assets/chevron.png")

/** The whole network with every disrupted stretch flagged; tap a line to pick it. */
export function NetworkMapScreen() {
  const router = useRouter()
  const { data } = useServiceStatus()
  const [selected, setSelected] = useState<RailLineId | null>(null)
  const [dayType, setDayType] = useState<DayType>(() => currentDayType())

  const onSelectLine = (lineId: RailLineId | null) => {
    if (lineId) HapticFeedback.trigger("impactLight")
    setSelected(lineId)
  }

  const status = selected ? data?.lines.find((l) => l.lineId === selected) : undefined
  const line = selected ? getRailLine(selected) : undefined

  const openDetails = () => {
    if (!selected) return
    trackEvent("service_status_line_pressed", { lineId: selected, source: "map" })
    router.push({ pathname: "/service-status/[lineId]", params: { lineId: selected } })
  }

  return (
    <View style={styles.root} testID="network-map-screen">
      <RailMap status={data} dayType={dayType} selectedLineId={selected} onSelectLine={onSelectLine} style={styles.map} />
      {/* The timetable differs between the week and the weekend: two maps. */}
      <View style={styles.dayTypes} pointerEvents="box-none" testID="network-map-day-types">
        {(["weekday", "weekend"] as const).map((type) => (
          <Chip
            key={type}
            variant={dayType === type ? "primary" : "default"}
            onPress={() => {
              if (type === dayType) return
              HapticFeedback.trigger("impactLight")
              trackEvent("service_status_day_type_changed", { dayType: type })
              setDayType(type)
            }}
          >
            <Text
              style={[styles.dayTypeText, dayType === type && styles.dayTypeTextSelected]}
              tx={`serviceStatus.dayType.${type}`}
            />
          </Chip>
        ))}
      </View>
      <View style={styles.footer}>
        {line ? (
          <TouchableHighlight
            underlayColor={color.inputPlaceholderBackground}
            onPress={openDetails}
            style={styles.card}
            testID="network-map-selected"
          >
            <View style={styles.cardInner}>
              <View style={[styles.bar, { backgroundColor: line.color }]} />
              <LineBadge line={line} />
              <View style={styles.cardTexts}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {status ? lineName(status) : line.name.en}
                </Text>
                <SelectedLevel level={status?.level} />
              </View>
              <Image source={chevronIcon} style={CHEVRON_ICON} />
            </View>
          </TouchableHighlight>
        ) : (
          <View style={styles.hint}>
            <Text style={styles.hintText} tx="serviceStatus.networkMapHint" />
            {data && <LiveIndicator realtime={data.realtime} compact />}
            <Text style={styles.credit} tx="serviceStatus.mapCredit" preset="secondary" />
          </View>
        )}
      </View>
    </View>
  )
}

function SelectedLevel({ level }: { level?: Parameters<typeof useStatusLevelColor>[0] }) {
  const levelColor = useStatusLevelColor(level ?? "unknown")
  return <Text style={[styles.cardLevel, { color: levelColor }]}>{levelLabel(level ?? "unknown")}</Text>
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  dayTypes: {
    position: "absolute",
    top: theme.spacing[3],
    insetInlineEnd: theme.spacing[3],
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  dayTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  dayTypeTextSelected: {
    color: theme.colors.whiteText,
  },
  footer: {
    padding: theme.spacing[3],
    paddingBottom: rt.insets.bottom + theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.tertiaryBackground,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingEnd: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  bar: {
    alignSelf: "stretch",
    width: 6,
    marginVertical: -theme.spacing[3],
  },
  cardTexts: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cardLevel: {
    fontSize: 15,
    fontWeight: "500",
  },
  hint: {
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
  },
  hintText: {
    color: theme.colors.label,
  },
  credit: {
    textAlign: "center",
    paddingHorizontal: theme.spacing[3],
  },
}))
