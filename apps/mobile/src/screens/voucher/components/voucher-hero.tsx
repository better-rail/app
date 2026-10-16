import { Image, ImageBackground, View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { format } from "date-fns"
import { Text } from "@/components"
import { dateFnsLocalization, translate } from "@/i18n"
import { stationLocale, stationsObject } from "@/data/stations"
import { formatTime } from "@/utils/helpers/date-helpers"

const arrowIcon = require("../../../../assets/arrow-left.png")

type VoucherHeroProps = {
  trainNumber: number
  departureTime: number
  arrivalTime: number
  fromStationId: number
  toStationId: number
  height?: number
  style?: ViewStyle
}

/** The trip, styled like the iOS home screen widget: a dimmed station photo with the times over it. */
export function VoucherHero(props: VoucherHeroProps) {
  const { trainNumber, departureTime, arrivalTime, fromStationId, toStationId, height = 190, style } = props
  const stationName = (id: number) => stationsObject[id]?.[stationLocale] ?? ""

  return (
    <ImageBackground source={stationsObject[fromStationId]?.image} blurRadius={1.5} style={[styles.card, { height }, style]}>
      <View style={styles.dim} />

      <View style={styles.content}>
        <View>
          <Text style={styles.origin} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {stationName(fromStationId)}
          </Text>
          <View style={styles.destinationRow}>
            <View style={styles.arrowCircle}>
              <Image source={arrowIcon} style={styles.arrowIcon} />
            </View>
            <Text style={styles.destination} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {stationName(toStationId)}
            </Text>
          </View>
        </View>

        <View>
          <View style={styles.times}>
            <View>
              <Text style={styles.departureLabel}>{translate("routes.departure")}</Text>
              <Text style={styles.departureTime} maxFontSizeMultiplier={1.1}>
                {formatTime(departureTime)}
              </Text>
            </View>
            <View>
              <Text style={styles.arrivalLabel}>{translate("routes.arrival")}</Text>
              <Text style={styles.arrivalTime} maxFontSizeMultiplier={1.1}>
                {formatTime(arrivalTime)}
              </Text>
            </View>
          </View>
          <Text style={styles.details} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {translate("voucher.trainOnDate", {
              trainNumber,
              date: format(departureTime, "EEEE, d.M", { locale: dateFnsLocalization }),
            })}
          </Text>
        </View>
      </View>
    </ImageBackground>
  )
}

const textShadow = {
  textShadowColor: "rgba(0, 0, 0, 0.6)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
}

// The widget's muted gray for arrival, readable over the dimmed photo
const MUTED = "#a1a1a6"

// Heebo's descender as a fraction of the font size (862 / 2048 units)
const HEEBO_DESCENT = 862 / 2048

const styles = StyleSheet.create((theme, rt) => ({
  card: {
    overflow: "hidden",
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: theme.colors.palette.black,
    // boxShadow isn't clipped by overflow: hidden, unlike the shadow* props
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
  },
  // Same treatment as the widget background: the photo stays a texture, the text stays readable
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.74)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: theme.spacing[4],
  },
  origin: {
    color: theme.colors.palette.white,
    fontSize: 18,
    fontWeight: "700",
    ...textShadow,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  // Matches the widget previews in Settings
  arrowCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.palette.white,
  },
  arrowIcon: {
    width: 9,
    height: 9,
    tintColor: "#000000",
    // The asset points left, which is forward in right-to-left layouts
    transform: rt.rtl ? undefined : [{ rotate: "180deg" }],
  },
  destination: {
    flexShrink: 1,
    color: theme.colors.palette.white,
    fontSize: 15,
    fontWeight: "500",
    ...textShadow,
  },
  times: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing[4],
  },
  departureLabel: {
    marginBottom: 3,
    color: theme.colors.palette.pinky,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  departureTime: {
    color: theme.colors.palette.white,
    fontSize: 40,
    // Below Heebo's natural line height iOS trims the line from the top; 46+ keeps the digits whole
    lineHeight: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    // Both lines keep Heebo's full descent, which grows with size; this lands both times on one baseline
    marginBottom: -(40 - 26) * HEEBO_DESCENT,
    ...textShadow,
  },
  arrivalLabel: {
    marginBottom: 4,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  arrivalTime: {
    color: MUTED,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  details: {
    marginTop: 2,
    color: theme.colors.palette.white,
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.8,
  },
}))
