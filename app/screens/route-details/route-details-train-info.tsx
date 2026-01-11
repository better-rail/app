import { useMemo } from "react"
import { View, ViewStyle, ScrollView, TextStyle } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { RouteDetailsTrainInfoScreenProps } from "../../navigators/main-navigator"
import type { Wagon } from "../../services/api/rail-api.types"
import { translate } from "../../i18n"

const ROOT: ViewStyle = {
  flex: 1,
}

const HEADER_CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing[4],
  gap: spacing[2],
  paddingTop: spacing[4],
  paddingStart: spacing[5],
}

const WAGON_ITEM_CONTAINER: ViewStyle = {
  alignItems: "center",
  marginRight: spacing[1],
}

const WAGON_NUMBER_TEXT: TextStyle = {
  fontSize: 12,
  color: color.primary,
  fontWeight: "600",
  width: 50,
  textAlign: "center",
  marginBottom: spacing[1],
}

const WAGONS_SCROLL_CONTAINER: ViewStyle = {
  flexDirection: "row",
  paddingHorizontal: spacing[4],
  alignItems: "flex-start",
  justifyContent: "center",
  flexGrow: 1,
  direction: "ltr",
}

const DIRECTION_INDICATOR: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  marginLeft: spacing[2],
}

const DIRECTION_ARROW: TextStyle = {
  fontSize: 20,
  color: color.primary,
}

const DIRECTION_LABEL: TextStyle = {
  fontSize: 10,
  color: color.label,
  marginTop: spacing[0],
}

const LEGEND_CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: spacing[4],
}

const LEGEND_ITEM: ViewStyle = {
  flexDirection: "column",
  alignItems: "center",
  gap: spacing[1],
}

const LEGEND_TEXT: TextStyle = {
  fontSize: 13,
  color: color.label,
}

const METADATA_CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing[1],
  gap: spacing[4],
}

const METADATA_ITEM: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing[1],
}

const METADATA_TEXT: TextStyle = {
  fontSize: 14,
  color: color.text,
}

const WAGON_BOX: ViewStyle = {
  width: 50,
  height: 50,
  borderWidth: 1,
  borderColor: color.primary,
  backgroundColor: color.secondaryBackground,
  justifyContent: "center",
  alignItems: "center",
}

const WAGON_BOX_FIRST: ViewStyle = {
  ...WAGON_BOX,
  borderTopLeftRadius: 12,
  borderBottomLeftRadius: 12,
  borderTopRightRadius: 0,
  borderBottomRightRadius: 0,
  borderLeftWidth: 1.5,
}

const WAGON_BOX_LAST: ViewStyle = {
  ...WAGON_BOX,
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
  borderTopRightRadius: 12,
  borderBottomRightRadius: 12,
  borderRightWidth: 1.5,
}

const WAGON_BOX_WITH_FEATURES: ViewStyle = {
  backgroundColor: color.primary,
  borderColor: color.primary,
  borderLeftWidth: 1.5,
  borderRightWidth: 1.5,
}

const FEATURE_ICON_CONTAINER: ViewStyle = {
  flexDirection: "row",
  gap: spacing[1],
  alignItems: "center",
}

const FEATURE_ICON_BADGE: ViewStyle = {
  backgroundColor: "white",
  borderRadius: 4,
  paddingHorizontal: 2,
  paddingVertical: 1,
}

const FEATURE_ICON_TEXT: TextStyle = {
  fontSize: 14,
}

const DIVIDER: ViewStyle = {
  height: 1,
  backgroundColor: color.separator,
  marginVertical: spacing[4],
}

function WagonItem({ wagon, isFirst, isLast }: { wagon: Wagon; isFirst: boolean; isLast: boolean }) {
  const hasFeatures = wagon.handicapped || wagon.bicycle

  let boxStyle: ViewStyle
  if (hasFeatures) {
    // When wagon has features, use base style and override with feature style
    boxStyle = isFirst
      ? { ...WAGON_BOX_FIRST, ...WAGON_BOX_WITH_FEATURES }
      : isLast
      ? { ...WAGON_BOX_LAST, ...WAGON_BOX_WITH_FEATURES }
      : { ...WAGON_BOX, ...WAGON_BOX_WITH_FEATURES }
  } else {
    boxStyle = isFirst ? WAGON_BOX_FIRST : isLast ? WAGON_BOX_LAST : WAGON_BOX
  }

  const containerStyle = isLast ? [WAGON_ITEM_CONTAINER, { marginRight: 0 }] : WAGON_ITEM_CONTAINER

  return (
    <View style={containerStyle}>
      <Text style={WAGON_NUMBER_TEXT}>{wagon.shurA2}</Text>
      <View style={boxStyle}>
        {hasFeatures && (
          <View style={FEATURE_ICON_CONTAINER}>
            {wagon.handicapped && (
              <View style={FEATURE_ICON_BADGE}>
                <Text style={FEATURE_ICON_TEXT}>♿</Text>
              </View>
            )}
            {wagon.bicycle && (
              <View style={FEATURE_ICON_BADGE}>
                <Text style={FEATURE_ICON_TEXT}>🚲</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

export function RouteDetailsTrainInfo({ route }: RouteDetailsTrainInfoScreenProps) {
  const { train } = route.params

  const sortedWagons = useMemo(() => {
    if (!train.visaWagonData?.wagons || train.visaWagonData.wagons.length === 0) {
      return []
    }
    return [...train.visaWagonData.wagons].sort((a, b) => a.shurA2 - b.shurA2)
  }, [train.visaWagonData])

  const hasWagons = sortedWagons.length > 0
  const hasHandicapped = sortedWagons.some((w) => w.handicapped)
  const hasBicycle = sortedWagons.some((w) => w.bicycle)
  const showLegend = hasHandicapped || hasBicycle

  const seatCount = train.visaWagonData?.seatplaces
  const wagonCount = train.visaWagonData?.totkr

  return (
    <View style={ROOT}>
      <View style={HEADER_CONTAINER}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: color.text, textAlign: "center" }}>
          {train.trainNumber} {train.lastStop}
        </Text>
      </View>

      {hasWagons ? (
        <>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={WAGONS_SCROLL_CONTAINER}>
              {sortedWagons.map((wagon, index) => (
                <WagonItem key={wagon.krsid} wagon={wagon} isFirst={index === 0} isLast={index === sortedWagons.length - 1} />
              ))}
              <View style={DIRECTION_INDICATOR}>
                <Text style={WAGON_NUMBER_TEXT}> </Text>
                <Text style={DIRECTION_ARROW}>→</Text>
                <Text style={DIRECTION_LABEL}>Direction</Text>
              </View>
            </ScrollView>
          </View>

          <View style={DIVIDER} />

          {showLegend && (
            <View style={LEGEND_CONTAINER}>
              {hasHandicapped && (
                <View style={LEGEND_ITEM}>
                  <Text style={{ fontSize: 16 }}>♿</Text>
                  <Text style={LEGEND_TEXT}>{translate("routeDetails.wheelchairAccessible")}</Text>
                </View>
              )}
              {hasBicycle && (
                <View style={LEGEND_ITEM}>
                  <Text style={{ fontSize: 16 }}>🚲</Text>
                  <Text style={LEGEND_TEXT}>{translate("routeDetails.bicyclesAllowed")}</Text>
                </View>
              )}
            </View>
          )}

          <View style={DIVIDER} />

          {(seatCount || wagonCount) && (
            <View style={METADATA_CONTAINER}>
              {wagonCount && (
                <View style={METADATA_ITEM}>
                  <Text style={METADATA_TEXT}>{translate("routeDetails.wagonsCount", { count: wagonCount })}</Text>
                </View>
              )}
              {seatCount && (
                <View style={METADATA_ITEM}>
                  <Text style={METADATA_TEXT}>{translate("routeDetails.seatsCount", { count: seatCount })}</Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <Text style={{ color: color.label, marginTop: spacing[2] }}>No wagon information available</Text>
      )}
    </View>
  )
}
