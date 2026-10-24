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
  hasChanges = false,
  isCancelled = false,
}) => {
  if (isCancelled) {
    return <CancelledBadge />
  }

  // Show short route badge only when filter is off (hideShortRouteBadge is false)
  const showShortRouteBadge = isMuchShorter && !isMuchLonger && !hideShortRouteBadge

  if (!showShortRouteBadge && !(delay > 0)) {
    return (
      <Text style={styles.stopsText} maxFontSizeMultiplier={1}>
        {stopsText}
      </Text>
    )
  }

  if (!showShortRouteBadge && !hasChanges) {
    return <DelayBadge delay={delay} />
  }

  // Several indicators share the row, so the delay shrinks to "+X", and with all three the badge too
  const isCrowded = showShortRouteBadge && delay > 0 && hasChanges
  return (
    <View style={styles.wrapper}>
      <View style={styles.badges}>
        {delay > 0 && <DelayBadge delay={delay} onlyNumber />}
        {showShortRouteBadge && (
          <View style={[styles.shortRouteBadge, isRideActive && styles.shortRouteBadgeActive]}>
            <Text style={styles.shortRouteBadgeText} tx={isCrowded ? "routes.shortRouteCompact" : "routes.shortRoute"} />
          </View>
        )}
      </View>
      {hasChanges && (
        <Text style={styles.stopsText} maxFontSizeMultiplier={1}>
          {stopsText}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    marginTop: Platform.OS === "ios" ? (userLocale === "he" ? 4 : 2) : 6,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
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
    color: theme.skin.routeCard?.text ?? theme.colors.text,
  },
}))
