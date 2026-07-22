import { Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import { CancelledBadge, DelayBadge } from "./delay-badge"
import { userLocale } from "@/i18n"

/**
 * Displays route indicators (stops count, delay, cancellation, short route badge) in the route card.
 */
export const RouteIndicators = ({
  isMuchShorter,
  isMuchLonger,
  delay,
  stopsText,
  isRideActive,
  hideShortRouteBadge,
  isCancelled = false,
}) => {
  // A cancelled journey trumps every other indicator.
  if (isCancelled) {
    return <CancelledBadge />
  }

  // Show short route badge only when filter is off (hideShortRouteBadge is false)
  if (isMuchShorter && !isMuchLonger && !hideShortRouteBadge) {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.shortRouteBadge, isRideActive && styles.shortRouteBadgeActive]}>
          <Text style={styles.shortRouteBadgeText} tx="routes.shortRoute" />
        </View>
        {delay > 0 && <DelayBadge delay={delay} onlyNumber />}
      </View>
    )
  } else if (delay > 0) {
    return <DelayBadge delay={delay} />
  } else {
    return (
      <Text style={styles.stopsText} maxFontSizeMultiplier={1}>
        {stopsText}
      </Text>
    )
  }
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    marginTop: Platform.OS === "ios" ? (userLocale === "he" ? 4 : 2) : 6,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  shortRouteBadge: {
    paddingVertical: 1,
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.greenBackground,
    borderRadius: 6,
  },
  shortRouteBadgeActive: {
    backgroundColor: theme.colors.contrastedGreenBackground,
  },
  shortRouteBadgeText: {
    fontSize: 14,
    color: theme.colors.greenText,
  },
  stopsText: {
    fontSize: 14,
  },
}))
