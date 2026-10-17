import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet as RNStyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { Path, Svg } from "react-native-svg"
import { GlassView } from "expo-glass-effect"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { DayType } from "@/data/rail-service-patterns"
import { stationName, stationsObject } from "@/data/stations"
import { stationAlertFor, useSettingsStore } from "@/models"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import type { OpenState } from "../station-hours"
import type { StationStatus, StationStatusKind } from "../station-status"
import { levelLabel, openStateDetail } from "../service-status-text"
import { STATION_KIND_COLORS, useStationKindColor } from "../service-status-theme"
import { useStationCardStatus } from "../use-station-card-status"

const BELL_ICON = require("../../../../assets/bell.png")

/**
 * The height of a station's header without a photo, and the least and most it may be with one: a
 * photo sets the height from its own proportions, so the whole of it shows across the sheet.
 */
const HEADER_HEIGHT = 200
const MIN_PHOTO_HEIGHT = 180
const MAX_PHOTO_HEIGHT = 300

/** The header's height for a photo of the station across a sheet `width` wide: the photo's own shape, within reason. */
const photoHeaderHeight = (image: number, width: number): number => {
  const { width: w, height: h } = Image.resolveAssetSource(image) ?? { width: 0, height: 0 }
  if (!w || !h) return HEADER_HEIGHT
  return Math.min(MAX_PHOTO_HEIGHT, Math.max(MIN_PHOTO_HEIGHT, Math.round((width * h) / w)))
}

/** The pills on the header, each of which takes the card to its section when tapped. */
export type StationTile = "status" | "open"

type StationHeaderProps = {
  stationId: string
  dayType: DayType
  onClose: () => void
  /** The bell was tapped: the card shows its notifications section, where following is switched on and tuned. */
  onShowAlerts: () => void
  /** A pill was tapped: the card shows the section behind it. */
  onShowSection: (tile: StationTile) => void
}

/**
 * The top of a station's card, like a place card in Apple Maps: the station's photo across the
 * sheet, its name over it, and two pills saying how it is doing and whether it is open. The bell
 * (lit while the station is followed) and the close button float over the photo's top corner.
 * The controls are glass where iOS has it, and dark translucent discs elsewhere, so they read on
 * any photo. A station without a photo gets the same layout on the sheet's own colour.
 */
export function StationHeader({ stationId, dayType, onClose, onShowAlerts, onShowSection }: StationHeaderProps) {
  const name = stationName(stationId)
  const image = stationsObject[stationId]?.image
  const followed = useSettingsStore((s) => stationAlertFor(s.stationAlerts, stationId) !== undefined)
  const { status, kind, openState, clock, dayName } = useStationCardStatus(stationId, dayType)
  const overPhoto = !!image
  const { width } = useWindowDimensions()
  const height = image ? photoHeaderHeight(image, width) : HEADER_HEIGHT

  const content = (
    <>
      <View style={styles.buttons}>
        <RoundButton
          label={translate("stationAlerts.cardTitle") ?? ""}
          selected={followed}
          overPhoto={overPhoto}
          onPress={onShowAlerts}
          testID={followed ? "station-bell-on" : "station-bell-off"}
        >
          <Image source={BELL_ICON} style={[styles.bellIcon, followed || overPhoto ? styles.iconLight : styles.iconPlain]} />
        </RoundButton>
        <RoundButton label={translate("common.close") ?? ""} overPhoto={overPhoto} onPress={onClose} testID="station-close">
          <CloseGlyph light={overPhoto} />
        </RoundButton>
      </View>
      <View style={styles.bottom}>
        <Text style={[styles.title, overPhoto && styles.titleOverPhoto]} numberOfLines={2} accessibilityRole="header">
          {name}
        </Text>
        <View style={styles.pills}>
          <StatusPill status={status} kind={kind} overPhoto={overPhoto} onPress={() => onShowSection("status")} />
          <OpenPill
            openState={openState}
            today={clock.day}
            dayName={dayName}
            overPhoto={overPhoto}
            onPress={() => onShowSection("open")}
          />
        </View>
      </View>
    </>
  )

  // The photo is drawn the way the planner's station cards draw theirs, at the sheet's exact width and
  // the photo's own proportions, so the whole of it shows; the wash over it is the planner's too.
  if (image) {
    return (
      <ImageBackground
        source={image}
        style={[styles.header, { width, height }]}
        imageStyle={styles.photo}
        accessible={false}
        testID="station-header"
      >
        <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.7)"]} style={RNStyleSheet.absoluteFill} pointerEvents="none" />
        {content}
      </ImageBackground>
    )
  }
  return (
    <View style={[styles.header, { width, height }]} testID="station-header">
      {content}
    </View>
  )
}

/** A bare X: the button it sits on is the circle. */
function CloseGlyph({ light }: { light: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={light ? "#FFFFFF" : "#1D1D1F"}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={light ? 1 : 0.8}
      />
    </Svg>
  )
}

type RoundButtonProps = {
  label: string
  /** The bell while the station is followed: filled in the app's blue. */
  selected?: boolean
  overPhoto: boolean
  onPress: () => void
  testID: string
  children: React.ReactNode
}

/** A round control over the photo: glass where there is glass, a dark disc otherwise. */
function RoundButton({ label, selected = false, overPhoto, onPress, testID, children }: RoundButtonProps) {
  const a11y = {
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    accessibilityState: selected ? { selected } : undefined,
  }
  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} {...a11y} testID={testID}>
        <GlassView
          isInteractive
          colorScheme={overPhoto || selected ? "dark" : undefined}
          tintColor={selected ? SELECTED_TINT : undefined}
          style={styles.roundButton}
        >
          {children}
        </GlassView>
      </Pressable>
    )
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      {...a11y}
      style={[
        styles.roundButton,
        overPhoto ? styles.roundButtonOverPhoto : styles.roundButtonPlain,
        selected && styles.roundButtonSelected,
      ]}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  )
}

type PillProps = {
  /** What the pill is about, read out before its value and not drawn: the value speaks for itself. */
  heading: string
  dot: string
  text: string
  overPhoto: boolean
  onPress: () => void
  testID?: string
}

/** A dot in a colour and a few words, on a glass pill (a translucent one where there is no glass). */
function Pill({ heading, dot, text, overPhoto, onPress, testID }: PillProps) {
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.pillText, overPhoto && styles.pillTextOverPhoto]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </>
  )
  const a11y = { accessibilityRole: "button" as const, accessibilityLabel: `${heading}: ${text}` }
  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} {...a11y} style={styles.pillWrapper} testID={testID}>
        <GlassView isInteractive colorScheme={overPhoto ? "dark" : undefined} style={styles.pill}>
          {content}
        </GlassView>
      </Pressable>
    )
  }
  return (
    <Pressable
      onPress={onPress}
      {...a11y}
      style={({ pressed }) => [
        styles.pillWrapper,
        styles.pill,
        overPhoto ? styles.pillOverPhoto : styles.pillPlain,
        pressed && styles.pillPressed,
      ]}
      testID={testID}
    >
      {content}
    </Pressable>
  )
}

/** How the station is doing: "Good service", "Delays · Minor delays", "Closed". */
function StatusPill({
  status,
  kind,
  overPhoto,
  onPress,
}: {
  status: StationStatus
  kind: StationStatusKind | undefined
  overPhoto: boolean
  onPress: () => void
}) {
  const kindColor = useStationKindColor(kind)
  // On the darkened photo the brighter (dark-mode) colour reads best.
  const dot = kind ? (overPhoto ? STATION_KIND_COLORS[kind].dark : kindColor) : GREY_DOT
  const label = kind ? (translate(`serviceStatus.station.kinds.${kind}`) ?? kind) : "…"
  const detail = kind && (kind === "delays" || kind === "cancellations") && status.level ? levelLabel(status.level) : undefined
  return (
    <Pill
      heading={translate("serviceStatus.station.status") ?? ""}
      dot={dot}
      text={detail ? `${label} · ${detail}` : label}
      overPhoto={overPhoto}
      onPress={onPress}
      testID={kind ? `station-kind-${kind}` : "station-kind-loading"}
    />
  )
}

/** Open or closed, and until or from when. */
function OpenPill({
  openState,
  today,
  dayName,
  overPhoto,
  onPress,
}: {
  openState: OpenState | undefined
  today: number
  dayName: (day: number) => string
  overPhoto: boolean
  onPress: () => void
}) {
  const heading = translate("serviceStatus.station.openNow") ?? ""
  if (!openState || openState.state === "unknown") {
    return (
      <Pill
        heading={heading}
        dot={GREY_DOT}
        text={openState ? "–" : "…"}
        overPhoto={overPhoto}
        onPress={onPress}
        testID="station-tile-open"
      />
    )
  }
  const open = openState.state === "open"
  const word = translate(open ? "serviceStatus.station.open" : "serviceStatus.station.closedNow") ?? ""
  const detail = openStateDetail(openState, today, dayName)
  return (
    <Pill
      heading={heading}
      dot={open ? GREEN_DOT : GREY_DOT}
      text={detail ? `${word} · ${detail}` : word}
      overPhoto={overPhoto}
      onPress={onPress}
      testID={`station-open-${openState.state}`}
    />
  )
}

const GREEN_DOT = "#4CD964"
const GREY_DOT = "#AEAEB2"
/** The app's blue, for the bell's disc while the station is followed. */
const SELECTED_TINT = "#0A84FF"

const styles = StyleSheet.create((theme) => ({
  header: {
    justifyContent: "space-between",
    // Room for the sheet's grabber above the buttons.
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },
  photo: {
    resizeMode: "cover",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing[2],
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonPlain: {
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  roundButtonOverPhoto: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  roundButtonSelected: {
    backgroundColor: SELECTED_TINT,
  },
  bellIcon: {
    width: 20,
    height: 22,
  },
  iconPlain: {
    tintColor: theme.colors.text,
    opacity: 0.8,
  },
  iconLight: {
    tintColor: "#FFFFFF",
  },
  bottom: {
    gap: theme.spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  titleOverPhoto: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pills: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  pillWrapper: {
    flexShrink: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: 20,
  },
  pillPlain: {
    backgroundColor: theme.colors.tertiaryBackground,
  },
  pillOverPhoto: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pillPressed: {
    opacity: 0.7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  pillText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  pillTextOverPhoto: {
    color: "#FFFFFF",
  },
}))
