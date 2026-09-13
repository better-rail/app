import { useEffect, useRef, useState } from "react"
import { Image, ScrollView, TouchableOpacity, View, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { TrueSheet } from "@lodev09/react-native-true-sheet"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { getRailLine, type RailLine } from "@/data/rail-lines"
import type { DayType } from "@/data/rail-map-layout"
import type { LineStatus } from "@/services/api"
import { LineDetails } from "./line-details"
import { StationDetails } from "./station-details"
import { StationHeader } from "./station-header"
import { SHEET_DETENTS, SHEET_HEADER_HEIGHT } from "./status-sheet"
import { levelLabel, lineName } from "../service-status-text"
import { contrastText } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

const CLOSE_ICON = require("../../../../assets/close.png")

/** The detail sheet's name: the screen presents and dismisses it by name, in step with the status sheet. */
export const DETAIL_SHEET = "service-status-detail"

/** What the card is about: a line, or a station on the map. */
export type MapSelection = { kind: "line"; id: string } | { kind: "station"; id: string }

/** The sheet's own colour behind a station's header, where it shows at its smallest: the screens' background, as a hex for the native sheet. */
const STATION_SHEET_COLOR = { light: "#F2F2F7", dark: "#1C1C1E" }

type DetailSheetProps = {
  /** What to show; the last one stays on while the sheet slides away. */
  selection: MapSelection | null
  /** The timetable the map shows: which lines call at a station. */
  dayType: DayType
  /** The close button, or Android's back button: the screen takes the sheet down. */
  onClose: () => void
  /** The sheet is gone. */
  onDismissed: () => void
  /** A line picked from a station's card. */
  onSelectLine: (lineId: string) => void
  /** "Go now" on a station's card. */
  onGoNow: (stationId: string) => void
}

/**
 * A line's or a station's details on a sheet over the status sheet, like a place card in Apple Maps:
 * the list waits behind it, tucked down to its header. It cannot be swiped away, only closed from
 * its button.
 */
export function DetailSheet({ selection, dayType, onClose, onDismissed, onSelectLine, onGoNow }: DetailSheetProps) {
  const scroll = useRef<ScrollView>(null)
  const scheme = useColorScheme()
  const [shown, setShown] = useState(selection)
  const { data, isLoading } = useServiceStatus()
  const line = shown?.kind === "line" ? getRailLine(shown.id) : undefined
  const status = shown?.kind === "line" ? data?.lines.find((l) => l.lineId === shown.id) : undefined
  // The sheet itself is in the line's colour: where it shows past the band, at its smallest, it is the band's.
  const bandColor = line?.color ?? status?.line.color ?? "#8E8E93"
  const sheetColor = shown?.kind === "station" ? STATION_SHEET_COLOR[scheme === "dark" ? "dark" : "light"] : bandColor

  useEffect(() => {
    if (!selection) return
    setShown(selection)
    scroll.current?.scrollTo({ y: 0, animated: false })
  }, [selection])

  /** The card opens up to its full height and scrolls to `y` (from the top of its content). */
  const scrollTo = (y: number) => {
    TrueSheet.resize(DETAIL_SHEET, SHEET_DETENTS.length - 1).catch(() => undefined)
    scroll.current?.scrollTo({ y, animated: true })
  }

  const header = (() => {
    if (!shown) return undefined
    if (shown.kind === "station") return <StationHeader stationId={shown.id} onClose={onClose} />
    return (
      <LineHeader
        title={line?.name[userLocale] ?? (status ? lineName(status) : "")}
        line={line}
        status={status}
        isLoading={isLoading}
        bandColor={bandColor}
        onClose={onClose}
      />
    )
  })()

  return (
    <TrueSheet
      name={DETAIL_SHEET}
      detents={SHEET_DETENTS}
      dimmed={false}
      dismissible={false}
      scrollable
      backgroundColor={sheetColor}
      header={header}
      onDidDismiss={onDismissed}
      onBackPress={() => {
        onClose()
        return true
      }}
      testID="detail-sheet"
    >
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shown?.kind === "line" && <LineDetails lineId={shown.id} />}
        {shown?.kind === "station" && (
          <StationDetails
            stationId={shown.id}
            dayType={dayType}
            onSelectLine={onSelectLine}
            onGoNow={onGoNow}
            scrollTo={scrollTo}
          />
        )}
      </ScrollView>
    </TrueSheet>
  )
}

type LineHeaderProps = {
  title: string
  line: RailLine | undefined
  status: LineStatus | undefined
  isLoading: boolean
  bandColor: string
  onClose: () => void
}

/** The band in the line's colour: its name and level, and the button that closes the card. */
function LineHeader({ title, line, status, isLoading, bandColor, onClose }: LineHeaderProps) {
  const bandText = line?.textColor ?? contrastText(bandColor)

  return (
    <View style={[styles.band, { backgroundColor: bandColor }]} testID="line-status-header">
      <View style={styles.bandTexts}>
        <Text style={[styles.bandTitle, { color: bandText }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.bandLevel, { color: bandText }]}>
          {status ? levelLabel(status.level) : isLoading ? "…" : (translate("serviceStatus.levels.unknown") ?? "")}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={translate("common.close") ?? undefined}
        hitSlop={8}
        testID="line-status-close"
      >
        <Image source={CLOSE_ICON} style={[styles.closeIcon, { tintColor: bandText }]} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  scroll: {
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: rt.insets.bottom + theme.spacing[5],
  },
  band: {
    minHeight: SHEET_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[4],
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
  closeIcon: {
    width: 32,
    height: 32,
    opacity: 0.85,
  },
}))
