import { Platform, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import { CancelledBadge, DelayBadge } from "./delay-badge"
import { userLocale } from "@/i18n"
import { labelFontStyle } from "@/theme/theme-fonts"

/**
 * Displays route indicators (stops count, delay, cancellation, short route / better-to-wait badge) in the route card.
 */
export const RouteIndicators = ({
  isMuchShorter,
  isMuchLonger,
  isOvertaken = false,
  delay,
  stopsText,
  isRideActive,
  hideShortRouteBadge,
  hasChanges = false,
  isCancelled = false,
}) => {
  const { theme } = useUnistyles()

  if (isCancelled) {
    return <CancelledBadge />
  }

  // A later train arrives sooner: say so instead of anything else about the route.
  // The short route badge shows only when the filter is off (hideShortRouteBadge is false).
  const routeBadge = isOvertaken ? "wait" : isMuchShorter && !isMuchLonger && !hideShortRouteBadge ? "short" : null

  if (!routeBadge && !(delay > 0)) {
    return (
      <Text style={styles.stopsText} maxFontSizeMultiplier={1}>
        {stopsText}
      </Text>
    )
  }

  if (!routeBadge && !hasChanges) {
    return <DelayBadge delay={delay} />
  }

  // Several indicators share the row, so the delay shrinks to "+X", and with all three the badge too.
  // Theme label fonts run wider than Heebo, so there the badge shrinks as soon as it sits next to the changes.
  const isCrowded = routeBadge === "short" && hasChanges && (delay > 0 || Boolean(theme.skin.labelFont))
  return (
    <View style={styles.wrapper}>
      <View style={styles.badges}>
        {delay > 0 && <DelayBadge delay={delay} onlyNumber />}
        {routeBadge === "short" && (
          <View style={[styles.shortRouteBadge, isRideActive && styles.shortRouteBadgeActive]}>
            <Text
              style={styles.shortRouteBadgeText}
              tx={isCrowded ? "routes.shortRouteCompact" : "routes.shortRoute"}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            />
          </View>
        )}
        {routeBadge === "wait" && (
          <View style={styles.waitBadge}>
            <Text
              style={styles.waitBadgeText}
              tx="routes.betterToWait"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            />
          </View>
        )}
      </View>
      {hasChanges && (
        <Text
          style={styles.stopsTextShrinkable}
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {stopsText}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    flexShrink: 1,
    marginTop: Platform.OS === "ios" ? (userLocale === "he" ? 4 : 2) : 6,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  badges: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  shortRouteBadge: {
    flexShrink: 1,
    paddingVertical: 1,
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.greenBackground,
    borderRadius: 6,
  },
  shortRouteBadgeActive: {
    backgroundColor: theme.colors.contrastedGreenBackground,
  },
  waitBadge: {
    flexShrink: 1,
    paddingVertical: 1,
    paddingHorizontal: theme.spacing[2],
    backgroundColor: rt.themeName === "dark" ? "#5a4523" : "#fff1d6",
    borderRadius: 6,
  },
  waitBadgeText: {
    ...labelFontStyle(theme, 14),
    color: rt.themeName === "dark" ? "#f5c46b" : "#9a5b00",
  },
  shortRouteBadgeText: {
    ...labelFontStyle(theme, 14),
    color: theme.colors.greenText,
  },
  stopsText: {
    ...labelFontStyle(theme, 14),
    color: theme.skin.routeCard?.text ?? theme.colors.text,
  },
  stopsTextShrinkable: {
    ...labelFontStyle(theme, 14),
    color: theme.skin.routeCard?.text ?? theme.colors.text,
    flexShrink: 1,
  },
}))
