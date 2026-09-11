import { useEffect, useRef, useState } from "react"
import { Image, ScrollView, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { TrueSheet } from "@lodev09/react-native-true-sheet"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { getRailLine, type RailLine } from "@/data/rail-lines"
import type { LineStatus } from "@/services/api"
import { LineBadge } from "./line-badge"
import { LineDetails } from "./line-details"
import { SHEET_DETENTS, SHEET_HEADER_HEIGHT } from "./status-sheet"
import { levelLabel, lineName } from "../service-status-text"
import { contrastText } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

const CLOSE_ICON = require("../../../../assets/close.png")

/** The line sheet's name: the screen presents and dismisses it by name, in step with the status sheet. */
export const LINE_SHEET = "service-status-line"

type LineSheetProps = {
  /** The line to show; the last one stays on while the sheet slides away. */
  lineId: string | null
  /** The close button, or Android's back button: the screen takes the sheet down. */
  onClose: () => void
  /** The sheet is gone. */
  onDismissed: () => void
}

/**
 * A line's details on a sheet over the status sheet, like a place card in Apple Maps: the list waits
 * behind it, tucked down to its header. It cannot be swiped away, only closed from its button.
 */
export function LineSheet({ lineId, onClose, onDismissed }: LineSheetProps) {
  const scroll = useRef<ScrollView>(null)
  const [shownId, setShownId] = useState(lineId)
  const { data, isLoading } = useServiceStatus()
  const line = shownId ? getRailLine(shownId) : undefined
  const status = shownId ? data?.lines.find((l) => l.lineId === shownId) : undefined
  // The sheet itself is in the line's colour: where it shows past the band, at its smallest, it is the band's.
  const bandColor = line?.color ?? status?.line.color ?? "#8E8E93"

  useEffect(() => {
    if (!lineId) return
    setShownId(lineId)
    scroll.current?.scrollTo({ y: 0, animated: false })
  }, [lineId])

  return (
    <TrueSheet
      name={LINE_SHEET}
      detents={SHEET_DETENTS}
      dimmed={false}
      dismissible={false}
      scrollable
      backgroundColor={bandColor}
      header={
        shownId ? (
          <LineHeader
            title={line?.name[userLocale] ?? (status ? lineName(status) : "")}
            line={line}
            status={status}
            isLoading={isLoading}
            bandColor={bandColor}
            onClose={onClose}
          />
        ) : undefined
      }
      onDidDismiss={onDismissed}
      onBackPress={() => {
        onClose()
        return true
      }}
      testID="line-status-sheet"
    >
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shownId && <LineDetails lineId={shownId} />}
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

/** The band in the line's colour: its badge, name and level, and the button that closes the card. */
function LineHeader({ title, line, status, isLoading, bandColor, onClose }: LineHeaderProps) {
  const bandText = line?.textColor ?? contrastText(bandColor)

  return (
    <View style={[styles.band, { backgroundColor: bandColor }]} testID="line-status-header">
      {line && <LineBadge line={{ ...line, color: bandText, textColor: bandColor, badgeStyle: "solid" }} size={40} />}
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
