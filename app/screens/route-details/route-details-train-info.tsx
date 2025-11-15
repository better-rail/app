import { useMemo } from "react"
import { View, ViewStyle, ScrollView, Image, ImageStyle, TextStyle } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { RouteDetailsTrainInfoScreenProps } from "../../navigators/main-navigator"
import type { Wagon } from "../../services/api/rail-api.types"

const ROOT: ViewStyle = {
  flex: 1,
  padding: spacing[3],
}

const HEADER_CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing[4],
  gap: spacing[2],
}

const TRAIN_ICON: ImageStyle = {
  width: 20,
  height: 20,
  tintColor: color.destroy,
  resizeMode: "contain",
}

const WAGON_ROW_CONTAINER: ViewStyle = {
  marginTop: spacing[1],
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
  paddingHorizontal: spacing[2],
  alignItems: "flex-start",
  marginTop: spacing[8],
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

const FEATURE_ICON_TEXT: TextStyle = {
  fontSize: 16,
  color: color.whiteText,
}

const trainIcon = require("../../../assets/train.ios.png")

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
            {wagon.handicapped && <Text style={FEATURE_ICON_TEXT}>♿</Text>}
            {wagon.bicycle && <Text style={FEATURE_ICON_TEXT}>🚲</Text>}
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

  return (
    <View style={ROOT}>
      <View style={HEADER_CONTAINER}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: color.text }}>
          {train.trainNumber} {train.destinationStationName}
        </Text>
      </View>

      {hasWagons ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={WAGONS_SCROLL_CONTAINER}
          style={WAGON_ROW_CONTAINER}
        >
          {sortedWagons.map((wagon, index) => (
            <WagonItem key={wagon.krsid} wagon={wagon} isFirst={index === 0} isLast={index === sortedWagons.length - 1} />
          ))}
        </ScrollView>
      ) : (
        <Text style={{ color: color.label, marginTop: spacing[2] }}>No wagon information available</Text>
      )}
    </View>
  )
}
