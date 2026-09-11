import { useEffect, useRef, useState } from "react"
import { View, useWindowDimensions } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useLocalSearchParams } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import HapticFeedback from "react-native-haptic-feedback"
import { TrueSheet } from "@lodev09/react-native-true-sheet"
import { Chip, Text } from "@/components"
import { trackEvent } from "@/services/analytics"
import { type DayType, RailMap, currentDayType } from "@/components/rail-map"
import { getRailLine, type RailLineId } from "@/data/rail-lines"
import { SERVICE_PATTERNS } from "@/data/rail-map-layout"
import { LegendSheet } from "./components/legend-sheet"
import { LINE_SHEET, LineSheet } from "./components/line-sheet"
import { MapHeaderBlur } from "./components/map-header-blur"
import { SHEET_OPEN_DETENT, STATUS_SHEET, StatusSheet } from "./components/status-sheet"
import { useServiceStatus } from "./use-service-status"

/** The timetables the map can show, in the order of their chips. */
const DAY_TYPES: DayType[] = ["weekday", "weekend", "night"]

/**
 * The network map, full screen, under a sheet of every line's status, as in Apple Maps. Picking a line on
 * either brings its details up on a card over the list, and the map to the line.
 */
export function ServiceStatusScreen() {
  // A line to open with, for links into the screen.
  const { lineId } = useLocalSearchParams<{ lineId?: string }>()
  const headerHeight = useHeaderHeight()
  const { height: windowHeight } = useWindowDimensions()
  const { data } = useServiceStatus()
  const [selected, setSelected] = useState<string | null>(() => (lineId && getRailLine(lineId) ? lineId : null))
  const [dayType, setDayType] = useState<DayType>(() => currentDayType())
  // Where the sheet's top edge rests when collapsed, measured from the top of the screen.
  const [sheetTop, setSheetTop] = useState<number>()
  // Whether a line's card is up over the list, and its presentation, so a close waits for it.
  const cardUp = useRef(false)
  const presenting = useRef<Promise<void>>(Promise.resolve())

  const ignore = () => undefined

  /** The card comes up over the list, which tucks down to its header so the map shows above both. */
  const openCard = () => {
    cardUp.current = true
    TrueSheet.resize(STATUS_SHEET, 0).catch(ignore)
    presenting.current = TrueSheet.present(LINE_SHEET, SHEET_OPEN_DETENT).catch(ignore)
  }

  /** The card goes away and the list comes back up behind it in the same motion. */
  const closeLine = () => {
    setSelected(null)
    if (!cardUp.current) return
    TrueSheet.resize(STATUS_SHEET, SHEET_OPEN_DETENT).catch(ignore)
    presenting.current.then(() => TrueSheet.dismiss(LINE_SHEET)).catch(ignore)
  }

  const onCardDismissed = () => {
    cardUp.current = false
    setSelected(null)
    // Should the card have gone some other way, the list still comes back up.
    TrueSheet.resize(STATUS_SHEET, SHEET_OPEN_DETENT).catch(ignore)
  }

  // A line to open with: once the list is up, the card comes up over it.
  const ready = sheetTop !== undefined
  useEffect(() => {
    if (ready && selected && !cardUp.current) openCard()
    // Only the first presentation of the list opens a card by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const selectLine = (next: string | null, source: "sheet" | "map") => {
    if (!next) {
      closeLine()
      return
    }
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_line_pressed", { lineId: next, source })
    // A line that does not run on the map shown is drawn on the first of the day's maps it runs on.
    if (!SERVICE_PATTERNS[dayType].lines.includes(next as RailLineId)) {
      const runsOn = DAY_TYPES.find((type) => SERVICE_PATTERNS[type].lines.includes(next as RailLineId))
      if (runsOn) setDayType(runsOn)
    }
    setSelected(next)
    // Another line while the card is up: keep it, and bring the map back into view above it.
    if (cardUp.current) TrueSheet.resize(LINE_SHEET, SHEET_OPEN_DETENT).catch(ignore)
    else if (ready) openCard()
  }

  // Only lines the map knows are drawn on it; the sheet can still describe any line the server sent.
  const mapLineId = selected ? (getRailLine(selected)?.id ?? null) : null

  const changeDayType = (next: DayType) => {
    if (next === dayType) return
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_day_type_changed", { dayType: next })
    setDayType(next)
  }

  return (
    <View style={styles.root} testID="service-status-screen">
      <RailMap
        status={data}
        dayType={dayType}
        selectedLineId={mapLineId}
        focusLineId={mapLineId}
        onSelectLine={(next) => selectLine(next, "map")}
        insets={{ top: headerHeight, bottom: sheetTop === undefined ? 0 : Math.max(0, windowHeight - sheetTop) }}
        style={styles.map}
      />
      <MapHeaderBlur height={headerHeight} />
      {/* The timetable differs between the week, the weekend and weeknights: three maps. */}
      <View style={styles.dayTypes(headerHeight)} pointerEvents="box-none" testID="network-map-day-types">
        {DAY_TYPES.map((type) => (
          <Chip key={type} variant={dayType === type ? "primary" : "default"} onPress={() => changeDayType(type)}>
            <Text
              style={[styles.dayTypeText, dayType === type && styles.dayTypeTextSelected]}
              tx={`serviceStatus.dayType.${type}`}
            />
          </Chip>
        ))}
      </View>
      <StatusSheet onSelectLine={(next) => selectLine(next, "sheet")} onPresented={setSheetTop} />
      <LineSheet lineId={selected} onClose={closeLine} onDismissed={onCardDismissed} />
      <LegendSheet />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  dayTypes: (headerHeight: number) => ({
    position: "absolute",
    top: headerHeight + theme.spacing[2],
    insetInlineEnd: theme.spacing[3],
    flexDirection: "row",
    gap: theme.spacing[2],
  }),
  dayTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  dayTypeTextSelected: {
    color: theme.colors.whiteText,
  },
}))
