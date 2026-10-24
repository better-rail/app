/* eslint-disable react-native/no-inline-styles */
import React from "react"
import { View, ViewStyle, Platform, TouchableOpacity, Pressable, Image } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, fontScale } from "@/theme"
import { Text } from "@/components/text/text"
import { formatTime } from "@/utils/helpers/date-helpers"
import { translate, use12HourClock } from "@/i18n"
import { RouteIndicators } from "./route-indicators"
import { ContextMenu, ContextMenuAction } from "@/components/context-menu/context-menu"
import { createContextMenuActions } from "./route-context-menu-actions"
import type { RouteItem } from "@/services/api"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import { IS_E2E } from "@/config/e2e"
import { labelFontStyle } from "@/theme/theme-fonts"

// Setting static height for FlatList getItemLayout
export let RouteCardHeight = 75
export let RouteCardHeightWithHeader = 95
if (fontScale > 1.1) {
  RouteCardHeight = 85
  RouteCardHeightWithHeader = 105
}

export interface RouteCardProps extends TouchableScaleProps {
  departureTime: number
  arrivalTime: number
  duration: string
  isMuchShorter: boolean
  isMuchLonger: boolean
  stops: number
  delay: number
  /** Applied to the wrapper around the card, e.g. margins. */
  style?: ViewStyle
  /** Applied to the card surface itself, e.g. its background. */
  cardStyle?: ViewStyle
  isActiveRide: boolean
  shouldShowDashedLine?: boolean
  isRouteInThePast: boolean
  onLongPress?: () => void
  contextMenuActions?: ContextMenuAction[]
  routeItem?: RouteItem
  originId?: string
  destinationId?: string
  /**
   * Forces the train info header on/off regardless of the `showRouteCardHeader` setting.
   * Used to render side-by-side preview cards (e.g. the train info prompt).
   */
  showHeaderOverride?: boolean
  /** The rider holds a Jerusalem voucher for this route. */
  hasVoucher?: boolean
}

export function RouteCard(props: RouteCardProps) {
  const {
    departureTime,
    arrivalTime,
    duration,
    stops,
    delay,
    isMuchShorter,
    isMuchLonger,
    onPress = null,
    onLongPress = null,
    style,
    shouldShowDashedLine = true,
    contextMenuActions,
    routeItem,
    originId,
    destinationId,
    showHeaderOverride,
    hasVoucher,
  } = props

  const { theme } = useUnistyles()
  const { hideSlowTrains, showRouteCardHeader } = useSettingsStore(
    useShallow((s) => ({ hideSlowTrains: s.hideSlowTrains, showRouteCardHeader: s.showRouteCardHeader })),
  )

  // Format times
  const [formattedDepatureTime, formattedArrivalTime] = (() => {
    const formattedDepatureTime = formatTime(departureTime)
    const formattedArrivalTime = formatTime(arrivalTime)

    return [formattedDepatureTime, formattedArrivalTime]
  })()

  const stopsText = (() => {
    if (stops === 0) return translate("routes.noChange")
    if (stops === 1) return translate("routes.oneChange")
    return `${stops} ${translate("routes.changes")}`
  })()

  // More than one of short route badge, delay and changes crowds the row; cancelled cards show only their badge
  const isCancelled = routeItem?.isCancelled ?? false
  const showShortRouteBadge = isMuchShorter && !isMuchLonger && !hideSlowTrains
  const isBloatedIndicators = !isCancelled && [showShortRouteBadge, delay > 0, stops > 0].filter(Boolean).length > 1
  // "12:08 PM" needs the room the dashed lines take at the default font size
  const showDashedLine = shouldShowDashedLine && !isBloatedIndicators && !use12HourClock

  // Generate context menu actions if routeItem and IDs are provided
  const generatedContextMenuActions = (() => {
    if (routeItem && originId && destinationId) {
      return createContextMenuActions(routeItem, originId, destinationId)
    }
    return contextMenuActions || []
  })()

  const TouchableComponent = generatedContextMenuActions && Platform.OS === "ios" ? Pressable : TouchableScale

  // Get the main train (first train for departure info)
  const mainTrain = routeItem?.trains?.[0]
  const timeTextStyle = [styles.timeText, use12HourClock && styles.timeText12h, isCancelled && styles.cancelledTimeText]
  const departureTimeStyle = [...timeTextStyle, styles.departureTimeText]
  const arrivalTimeStyle = [...timeTextStyle, styles.arrivalTimeText]

  const getTrainType = (train: any): string => {
    if (!train?.visaWagonData?.wagons?.[0]?.krsG3) {
      return translate("trainTypes.tbd")
    }

    const carType = train.visaWagonData.wagons[0].krsG3
    switch (carType) {
      case "DD":
        return translate("trainTypes.doubleDecker")
      case "EMU":
        return translate("trainTypes.electric")
      case "SIM":
        return translate("trainTypes.singleDecker")
      default:
        return translate("trainTypes.tbd")
    }
  }

  const trainTypeImages = {
    DD: require("../../../assets/double-decker.png"),
    SIM: require("../../../assets/single-decker.png"),
    EMU: require("../../../assets/electric.png"),
    TBD: require("../../../assets/tbd.png"),
  }

  // TODO: Use this once we have a proper train type icon
  const renderTrainType = (train: any) => {
    const carType = train?.visaWagonData?.wagons?.[0]?.krsG3
    const imageSource = trainTypeImages[carType as keyof typeof trainTypeImages] || trainTypeImages.TBD

    return <Image source={imageSource} style={styles.trainTypeImage} resizeMode="contain" />
  }

  const showHeader = mainTrain && (showHeaderOverride ?? showRouteCardHeader)
  const containerStyle = showHeader ? styles.containerWithHeader : styles.containerWithoutHeader

  const cardContent = (
    <TouchableComponent
      testID={props.testID}
      onPress={onPress}
      onLongPress={Platform.OS === "android" ? onLongPress : undefined}
      activeScale={0.97}
      friction={generatedContextMenuActions && Platform.OS === "ios" ? undefined : 9}
      style={[
        styles.containerBase,
        containerStyle,
        hasVoucher && styles.voucherContainer,
        props.isActiveRide && styles.activeRideContainer,
        props.isRouteInThePast && styles.pastRideContainer,
        props.cardStyle,
      ]}
    >
      {/* Header with train information */}
      {showHeader && (
        <View style={styles.routeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[styles.headerText, mainTrain.originPlatformChanged && styles.platformChangedText]}
              tx="routeDetails.platform"
            />
            <Text
              style={[
                styles.trainNumberText,
                { marginLeft: spacing[1] },
                mainTrain.originPlatformChanged && styles.platformChangedText,
              ]}
            >
              {mainTrain.originPlatform}
            </Text>
          </View>

          {mainTrain.originPlatform > 0 && (
            <View style={styles.platformBadge}>
              <Text style={styles.headerText} tx="routeDetails.trainNo" />
              <Text style={[styles.platformText, { marginLeft: spacing[1] }]}>{mainTrain.trainNumber}</Text>
            </View>
          )}
        </View>
      )}

      {/* Main route content */}
      <View style={styles.routeContent}>
        <View style={{ marginEnd: spacing[3] }}>
          <View style={styles.departureLabel}>
            <Text style={styles.timeTypeText} tx="routes.departure" />
            {hasVoucher && (
              <Image
                source={require("../../../assets/station-ticket.png")}
                style={styles.voucherIcon}
                accessibilityLabel={translate("voucher.title") ?? undefined}
              />
            )}
          </View>
          <Text style={departureTimeStyle}>{formattedDepatureTime}</Text>
        </View>

        {showDashedLine && <DashedLine width={theme.skin.timeFont?.compact ? 20 : 35} />}

        <View style={{ marginHorizontal: spacing[1] }}>
          <View style={{ alignItems: "center", gap: spacing[0] }}>
            <Text style={styles.durationText} maxFontSizeMultiplier={1}>
              {duration}
            </Text>

            <RouteIndicators
              isMuchShorter={isMuchShorter}
              isMuchLonger={isMuchLonger}
              delay={delay}
              stopsText={stopsText}
              isRideActive={props.isActiveRide}
              hideShortRouteBadge={hideSlowTrains}
              hasChanges={stops > 0}
              isCancelled={isCancelled}
            />
          </View>
        </View>

        {showDashedLine && <DashedLine width={theme.skin.timeFont?.compact ? 20 : 35} />}

        <View style={{ alignItems: "flex-end", marginStart: spacing[3] }}>
          <Text style={styles.timeTypeText} tx="routes.arrival" />
          <Text style={arrivalTimeStyle}>{formattedArrivalTime}</Text>
        </View>
      </View>
    </TouchableComponent>
  )

  return (
    // The native menu host drops the card's own margins
    <ContextMenu actions={generatedContextMenuActions} previewBorderRadius={12} style={style} fillWidth disabled={IS_E2E}>
      {cardContent}
    </ContextMenu>
  )
}

const DashedLine = ({ width }: { width: number }) => (
  <Svg height={5} width={width}>
    <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)

const styles = StyleSheet.create((theme, rt) => ({
  containerBase: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.inputBackground,
    borderRadius: Platform.select({ ios: 12, android: 8 }),

    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.05,
    elevation: 1,
    // Set even without a skin: a key dropped on a theme switch keeps its old native value
    ...(theme.skin.routeCard
      ? {
          backgroundColor: theme.skin.routeCard.background,
          borderRadius: theme.skin.routeCard.radius,
          borderWidth: theme.skin.routeCard.borderWidth,
          borderColor: theme.skin.routeCard.border,
          boxShadow: theme.skin.routeCard.shadow,
        }
      : { borderWidth: 0, borderColor: "transparent", boxShadow: "0 0 0 transparent" }),
  },
  containerWithoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: RouteCardHeight,
  },
  containerWithHeader: {
    flexDirection: "column",
    justifyContent: "space-between",
    height: RouteCardHeightWithHeader,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing[2],
    paddingBottom: theme.spacing[1],
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.separator,
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  routeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    fontFamily: theme.typography.primary,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.dim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trainNumberText: {
    fontFamily: theme.typography.primary,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  platformBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  platformText: {
    fontFamily: theme.typography.primary,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  trainTypeText: {
    fontFamily: theme.typography.primary,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  trainTypeImage: {
    width: 20,
    height: 14,
    marginLeft: theme.spacing[1],
    tintColor: rt.themeName === "dark" ? "white" : "black",
  },
  activeRideContainer: {
    backgroundColor: theme.colors.greenBackground,
    shadowOpacity: 0.15,
    elevation: 2,
  },
  voucherContainer: {
    backgroundColor: theme.colors.voucherBackground,
    borderWidth: 1,
    borderColor: theme.colors.voucherBorder,
  },
  departureLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  voucherIcon: {
    width: 15,
    height: 15,
    marginBottom: -2,
    tintColor: theme.colors.voucherText,
  },
  pastRideContainer: {
    opacity: 0.4,
  },
  timeTypeText: {
    marginBottom: -2,
    color: theme.skin.routeCard?.label ?? theme.colors.dim,
    ...labelFontStyle(theme, 14, "500"),
  },
  // Heebo's line height keeps the card layout with any time font; every key is set so a theme switch resets it
  timeText: {
    color: theme.colors.text,
    lineHeight: 35,
    ...(theme.skin.timeFont
      ? {
          fontFamily: theme.skin.timeFont.family,
          fontWeight: "normal",
          fontSize: theme.skin.timeFont.size,
          letterSpacing: theme.skin.timeFont.letterSpacing ?? 0,
        }
      : { fontFamily: theme.typography.primary, fontWeight: "700", fontSize: 24, letterSpacing: 0 }),
  },
  // LED-style glow on skinned cards
  departureTimeText: {
    color: theme.skin.routeCard?.departureTime ?? theme.colors.text,
    textShadowColor: theme.skin.routeCard?.timeGlow ? theme.skin.routeCard.departureTime : "transparent",
    textShadowRadius: theme.skin.routeCard?.timeGlow ? 8 : 0,
  },
  arrivalTimeText: {
    color: theme.skin.routeCard?.arrivalTime ?? theme.colors.text,
    textShadowColor: theme.skin.routeCard?.timeGlow ? theme.skin.routeCard.arrivalTime : "transparent",
    textShadowRadius: theme.skin.routeCard?.timeGlow ? 8 : 0,
  },
  timeText12h: {
    fontSize: 20,
    lineHeight: 29,
  },
  cancelledTimeText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  platformChangedText: {
    color: theme.colors.destroy,
  },
  durationText: {
    marginBottom: -2,
    fontSize: 16,
    color: theme.skin.routeCard?.text ?? theme.colors.text,
  },
}))
