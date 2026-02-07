/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { observer } from "mobx-react-lite"
import { TextStyle, View, ViewStyle, Platform, TouchableOpacity, Pressable, Image, ImageStyle } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography, fontScale } from "../../theme"
import { primaryFontIOS } from "../../theme/typography"
import { Text } from "../"
import { format } from "date-fns"
import { translate } from "../../i18n"
import { RouteIndicators } from "./"
import { RouteContextMenu, RouteContextMenuAction } from "./platform-context-menu"
import { createContextMenuActions } from "./route-context-menu-actions"
import type { RouteItem } from "../../services/api"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import { useStores } from "../../models"

// #region styles

// Setting static height for FlatList getItemLayout
export let RouteCardHeight = 75
export let RouteCardHeightWithHeader = 95
if (fontScale > 1.1) {
  RouteCardHeight = 85
  RouteCardHeightWithHeader = 105
}

const CONTAINER_BASE: ViewStyle = {
  paddingVertical: spacing[2],
  paddingHorizontal: spacing[4],
  backgroundColor: color.inputBackground,
  borderRadius: Platform.select({ ios: 12, android: 8 }),

  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 1,
}

const CONTAINER_WITHOUT_HEADER: ViewStyle = {
  ...CONTAINER_BASE,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  height: RouteCardHeight,
}

const CONTAINER_WITH_HEADER: ViewStyle = {
  ...CONTAINER_BASE,
  flexDirection: "column",
  justifyContent: "space-between",
  height: RouteCardHeightWithHeader,
}

const ROUTE_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing[2],
  paddingBottom: spacing[1],
  borderBottomWidth: 0.5,
  borderBottomColor: color.separator,
  flexWrap: "wrap",
  gap: spacing[2],
}

const ROUTE_CONTENT: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  flex: 1,
}

const HEADER_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 11,
  fontWeight: "600",
  color: color.dim,
  textTransform: "uppercase",
  letterSpacing: 0.5,
}

const TRAIN_NUMBER_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 12,
  fontWeight: "700",
  color: color.text,
}

const PLATFORM_BADGE: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const PLATFORM_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 12,
  fontWeight: "700",
  color: color.text,
}

const TRAIN_TYPE_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 12,
  fontWeight: "700",
  color: color.text,
}

const TRAIN_TYPE_IMAGE: ImageStyle = {
  width: 20,
  height: 14,
  marginLeft: spacing[1],
}

const ACTIVE_RIDE_CONTAINER: ViewStyle = {
  backgroundColor: color.greenBackground,
  shadowOpacity: 0.15,
  elevation: 2,
}

const PAST_RIDE_CONTAINER: ViewStyle = {
  opacity: 0.4,
}

const TIME_TYPE_TEXT: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 1 : -2,
  fontFamily: typography.primary,
  fontSize: 14,
  fontWeight: "500",
  color: color.dim,
}

const TIME_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "700",
  fontSize: 24,
  color: color.text,
}

const DURATION_TEXT: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 2 : -2,
  fontSize: 16,
}

// #endregion

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

export const RouteCard = observer(function RouteCard(props: RouteCardProps) {
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

  const isDarkMode = useIsDarkMode()
  const { settings } = useStores()

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
  const isBloatedIndicators = isMuchShorter && !isMuchLonger && delay > 0 && !settings.hideSlowTrains

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
        style={[TRAIN_TYPE_IMAGE, { tintColor: isDarkMode ? "white" : "black" }]}
        resizeMode="contain"
      />
    )
  }

  const showHeader = mainTrain && settings.showRouteCardHeader
  const containerStyle = showHeader ? CONTAINER_WITH_HEADER : CONTAINER_WITHOUT_HEADER

  const cardContent = (
    <TouchableComponent
      onPress={onPress}
      onLongPress={Platform.OS === "android" ? onLongPress : undefined}
      activeScale={0.97}
      friction={generatedContextMenuActions && Platform.OS === "ios" ? undefined : 9}
      style={[containerStyle, props.isActiveRide && ACTIVE_RIDE_CONTAINER, props.isRouteInThePast && PAST_RIDE_CONTAINER, style]}
    >
      {/* Header with train information */}
      {showHeader && (
        <View style={ROUTE_HEADER}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={HEADER_TEXT} tx="routeDetails.platform" />
            <Text style={[TRAIN_NUMBER_TEXT, { marginLeft: spacing[1] }]}>{mainTrain.originPlatform}</Text>
          </View>

          {mainTrain.originPlatform > 0 && (
            <View style={PLATFORM_BADGE}>
              <Text style={HEADER_TEXT} tx="routeDetails.trainNo" />
              <Text style={[PLATFORM_TEXT, { marginLeft: spacing[1] }]}>{mainTrain.trainNumber}</Text>
            </View>
          )}
        </View>
      )}

      {/* Main route content */}
      <View style={ROUTE_CONTENT}>
        <View style={{ marginEnd: spacing[3] }}>
          <Text style={TIME_TYPE_TEXT} tx="routes.departure" />
          <Text style={TIME_TEXT}>{formattedDepatureTime}</Text>
        </View>

        {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

        <View style={{ marginHorizontal: spacing[1] }}>
          <View style={{ alignItems: "center", gap: spacing[0] }}>
            <Text style={DURATION_TEXT} maxFontSizeMultiplier={1}>
              {duration}
            </Text>

            <RouteIndicators
              isMuchShorter={isMuchShorter}
              isMuchLonger={isMuchLonger}
              delay={delay}
              stopsText={stopsText}
              isRideActive={props.isActiveRide}
              hideShortRouteBadge={settings.hideSlowTrains}
            />
          </View>
        </View>

        {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

        <View style={{ alignItems: "flex-end", marginStart: spacing[3] }}>
          <Text style={TIME_TYPE_TEXT} tx="routes.arrival" />
          <Text style={TIME_TEXT}>{formattedArrivalTime}</Text>
        </View>
      </View>
    </TouchableComponent>
  )

  return (
    <RouteContextMenu actions={generatedContextMenuActions} onLongPress={onLongPress}>
      {cardContent}
    </RouteContextMenu>
  )
})

const DashedLine = () => (
  <Svg height={5} width={35}>
    <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
