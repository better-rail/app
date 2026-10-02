/* eslint-disable react-native/no-inline-styles */

import {
  ActivityIndicator,
  Appearance,
  Image,
  ImageBackground,
  Platform,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native"
import LinearGradient from "react-native-linear-gradient"
import TouchableScale, { type TouchableScaleProps } from "react-native-touchable-scale"
import { StyleSheet, withUnistyles } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import { color } from "@/theme"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

export function getStationCardHeight(screenHeight: number, screenWidth?: number): number {
  if (screenWidth && (screenWidth >= 600 || screenWidth > screenHeight)) {
    return Math.round(Math.min(175, Math.max(125, screenHeight < 680 ? 128 : screenWidth * 0.38)))
  }

  if (screenHeight > 900) return 190
  if (screenHeight > 780) return 178.5
  if (screenHeight > 730) return 157.5
  if (screenHeight > 600) return 135
  return 120
}

const ThemedTouchableScale = withUnistyles(TouchableScale)
const isDarkMode = Appearance.getColorScheme() === "dark"

export interface StationCardProps extends TouchableScaleProps {
  name: string
  image: ImageSourcePropType
  style?: ViewStyle
  loading?: boolean
  badges?: StationCardBadge[]
}

export type StationCardBadge = {
  label: string
  icon?: ImageSourcePropType
  tone?: "highlight" | "neutral"
}

export function StationCard(props: StationCardProps) {
  const { name, image, style, loading, badges, ...rest } = props
  const { width, height: screenHeight } = useWindowDimensions()
  const cardHeight = getStationCardHeight(screenHeight, width)

  const badgeRow = !!badges?.length && (
    <View style={styles.badges}>
      {badges.map(({ label, icon, tone }) => {
        const highlight = tone === "highlight"
        return (
          <View key={label} style={[styles.badge, highlight && styles.badgeHighlight]}>
            {icon && <Image source={icon} style={[styles.badgeIcon, highlight && styles.badgeHighlightContent]} />}
            <Text style={[styles.badgeText, highlight && styles.badgeHighlightContent]} maxFontSizeMultiplier={1.2}>
              {label}
            </Text>
          </View>
        )
      })}
    </View>
  )

  const loadingOverlay = loading && (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="white" />
    </View>
  )

  if (!name) {
    return (
      <ThemedTouchableScale style={[styles.container, style]} activeScale={0.95} friction={9} {...rest}>
        <View style={[styles.emptyCardWrapper, { height: cardHeight }]}>
          <Image source={require("../../../assets/railway-station.png")} style={styles.emptyCardImage} />
          <Text style={styles.emptyCardText} tx="plan.selectStation" />
        </View>
      </ThemedTouchableScale>
    )
  }

  if (!image) {
    return (
      <ThemedTouchableScale
        style={[styles.container, styles.imagelessCard, { height: cardHeight }, style]}
        activeScale={0.95}
        friction={9}
        {...rest}
      >
        <LinearGradient
          style={styles.gardient}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          // @ts-expect-error OpaqueColorValue
          colors={[Platform.select({ ios: color.secondaryLighter, android: "#f6eae3" }), "#ffd9c2"]}
        />
        <LinearGradient style={styles.gardient} colors={["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.3)"]} />

        {badgeRow}
        <Text style={styles.text}>{name}</Text>
        {loadingOverlay}
      </ThemedTouchableScale>
    )
  }

  return (
    <ThemedTouchableScale
      style={[styles.container, style]}
      activeScale={0.95}
      friction={9}
      accessibilityLabel={badges?.length ? [name, ...badges.map((b) => b.label)].join(", ") : undefined}
      {...rest}
    >
      <ImageBackground
        imageStyle={styles.imageBackgroundImage}
        source={image}
        style={[styles.background, { height: cardHeight }]}
      >
        <LinearGradient
          style={styles.gardient}
          colors={["rgba(0, 0, 0, 0.05)", isDarkMode ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.65)"]}
        />

        {badgeRow}
        <Text style={styles.text}>{name}</Text>
        {loadingOverlay}
      </ImageBackground>
    </ThemedTouchableScale>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderRadius: 12,
    backgroundColor: theme.colors.inputPlaceholderBackground,
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.2,
    elevation: 3,
  },
  imagelessCard: {
    justifyContent: "flex-end",
  },
  emptyCardWrapper: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  emptyCardImage: {
    width: 48,
    height: 48,
    marginBottom: theme.spacing[2],
    tintColor: theme.colors.dim,
  },
  background: {
    width: "100%",
    justifyContent: "flex-end",
  },
  imageBackgroundImage: {
    borderRadius: isLiquidGlassSupported ? 14 : 6,
  },
  text: {
    marginStart: theme.spacing[3],
    marginBottom: theme.spacing[2],
    color: theme.colors.palette.white,
    fontFamily: theme.typography.primary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "left",
    textShadowColor: theme.colors.palette.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badges: {
    position: "absolute",
    top: theme.spacing[2],
    start: theme.spacing[2],
    end: theme.spacing[2],
    alignItems: "flex-end",
    gap: theme.spacing[1],
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
  },
  badgeHighlight: {
    backgroundColor: theme.colors.success,
  },
  badgeIcon: {
    width: 13,
    height: 13,
    resizeMode: "contain",
    tintColor: theme.colors.palette.black,
  },
  badgeText: {
    color: theme.colors.palette.black,
    fontSize: 13,
    fontWeight: "600",
  },
  badgeHighlightContent: {
    color: theme.colors.palette.white,
    tintColor: theme.colors.palette.white,
  },
  emptyCardText: {
    color: theme.colors.dim,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: isLiquidGlassSupported ? 14 : 6,
  },
  gardient: {
    height: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 1,
    borderRadius: isLiquidGlassSupported ? 12 : 6,
  },
}))
