/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { View, ViewStyle, Platform, TouchableOpacity, Pressable, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, fontScale } from "@/theme"
import { Text } from "@/components/text/text"
import { format } from "date-fns"
import { translate } from "@/i18n"
import { RouteIndicators } from "./route-indicators"
import { RouteContextMenu, RouteContextMenuAction } from "./platform-context-menu"
import { createContextMenuActions } from "./route-context-menu-actions"
import type { RouteItem } from "@/services/api"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"

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
  style?: ViewStyle
  isActiveRide: boolean
  shouldShowDashedLine?: boolean
  isRouteInThePast: boolean
  onLongPress?: () => void
  contextMenuActions?: RouteContextMenuAction[]
  routeItem?: RouteItem
  originId?: string
  destinationId?: string
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
  } = props

  const { hideSlowTrains, showRouteCardHeader } = useSettingsStore(
    useShallow((s) => ({ hideSlowTrains: s.hideSlowTrains, showRouteCardHeader: s.showRouteCardHeader }))
  )

  // Format times
  const [formattedDepatureTime, formattedArrivalTime] = useMemo(() => {
    const formattedDepatureTime = format(new Date(departureTime), "HH:mm")
    const formattedArrivalTime = format(new Date(arrivalTime), "HH:mm")

    return [formattedDepatureTime, formattedArrivalTime]
  }, [departureTime, arrivalTime])

  const stopsText = useMemo(() => {
    if (stops === 0) return translate("routes.noChange")
    if (stops === 1) return translate("routes.oneChange")
    return `${stops} ${translate("routes.changes")}`
  }, [stops])

  // Check if indicators are bloated (short route badge with delay shown)
  const isBloatedIndicators = isMuchShorter && !isMuchLonger && delay > 0 && !hideSlowTrains

  // Generate context menu actions if routeItem and IDs are provided
  const generatedContextMenuActions = useMemo(() => {
    if (routeItem && originId && destinationId) {
      return createContextMenuActions(routeItem, originId, destinationId)
    }
    return contextMenuActions || []
  }, [routeItem, originId, destinationId, contextMenuActions])

  const TouchableComponent = generatedContextMenuActions && Platform.OS === "ios" ? Pressable : TouchableScale

  // Get the main train (first train for departure info)
  const mainTrain = routeItem?.trains?.[0]

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

    return (
      <Image
        source={imageSource}
        style={styles.trainTypeImage}
        resizeMode="contain"
      />
    )
  }

  const showHeader = mainTrain && showRouteCardHeader
  const containerStyle = showHeader ? styles.containerWithHeader : styles.containerWithoutHeader

  const cardContent = (
    <TouchableComponent
      onPress={onPress}
      onLongPress={Platform.OS === "android" ? onLongPress : undefined}
      activeScale={0.97}
      friction={generatedContextMenuActions && Platform.OS === "ios" ? undefined : 9}
      style={[
        styles.containerBase,
        containerStyle,
        props.isActiveRide && styles.activeRideContainer,
        props.isRouteInThePast && styles.pastRideContainer,
        style,
      ]}
    >
      {/* Header with train information */}
      {showHeader && (
        <View style={styles.routeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.headerText} tx="routeDetails.platform" />
            <Text style={[styles.trainNumberText, { marginLeft: spacing[1] }]}>{mainTrain.originPlatform}</Text>
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
          <Text style={styles.timeTypeText} tx="routes.departure" />
          <Text style={styles.timeText}>{formattedDepatureTime}</Text>
        </View>

        {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

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
            />
          </View>
        </View>

        {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

        <View style={{ alignItems: "flex-end", marginStart: spacing[3] }}>
          <Text style={styles.timeTypeText} tx="routes.arrival" />
          <Text style={styles.timeText}>{formattedArrivalTime}</Text>
        </View>
      </View>
    </TouchableComponent>
  )

  return (
    <RouteContextMenu actions={generatedContextMenuActions} onLongPress={onLongPress}>
      {cardContent}
    </RouteContextMenu>
  )
}

const DashedLine = () => (
  <Svg height={5} width={35}>
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
    tintColor: rt.colorScheme === "dark" ? "white" : "black",
  },
  activeRideContainer: {
    backgroundColor: theme.colors.greenBackground,
    shadowOpacity: 0.15,
    elevation: 2,
  },
  pastRideContainer: {
    opacity: 0.4,
  },
  timeTypeText: {
    marginBottom: -2,
    fontFamily: theme.typography.primary,
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.dim,
  },
  timeText: {
    fontFamily: theme.typography.primary,
    fontWeight: "700",
    fontSize: 24,
    color: theme.colors.text,
  },
  durationText: {
    marginBottom: -2,
    fontSize: 16,
  },
}))
