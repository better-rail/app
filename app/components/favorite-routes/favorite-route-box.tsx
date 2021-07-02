import React, { useMemo } from "react"
import {
  View,
  ViewStyle,
  Dimensions,
  TextStyle,
  ImageBackground,
  ImageStyle,
  StyleSheet,
} from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing, fontScale } from "../../theme"
import { translate } from "../../i18n"
import { useActionSheet } from "@expo/react-native-action-sheet"
import prompt from "react-native-prompt-android"
import { useStores } from "../../models"

const deviceWidth = Dimensions.get("screen").width
const marginBetweenItems = spacing[4]

// #region styles
const CONTAINER: ViewStyle = {
  backgroundColor: "#fff",
  borderRadius: 10,
  marginBottom: marginBetweenItems,
  padding: spacing[3],
}

const IMAGE_BACKGROUND: ImageStyle = {
  ...StyleSheet.absoluteFillObject,
  justifyContent: "center",
  borderRadius: 8,
  overflow: "hidden",
}

const BACKGROUND_DIMMER: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "#111",
  opacity: 0.6,
}

const STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const STATION_NAME: TextStyle = {
  color: color.whiteText,
  fontWeight: "500",
  fontSize: 16.5,
  textShadowRadius: 6,
  textShadowColor: "rgba(0,0,0,0.5)",
}

const STATION_CIRCLE_SIZE = 14 * fontScale

const STATION_CIRCLE: ViewStyle = {
  width: STATION_CIRCLE_SIZE,
  height: STATION_CIRCLE_SIZE,
  marginEnd: spacing[2],
  backgroundColor: "#fff",
  borderWidth: 2,
  borderColor: "lightgrey",
  borderRadius: 10,
  zIndex: 10,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 2,
}

const STATION_ORIGIN_CIRCLE: ViewStyle = {
  backgroundColor: color.secondary,
  borderColor: "#fff",
}

const CONTENT: ViewStyle = {
  position: "relative",
}

const LINE_WIDTH = 2.5 * fontScale

const LINE: ViewStyle = {
  position: "absolute",
  start: (STATION_CIRCLE_SIZE - LINE_WIDTH) / 2,
  top: STATION_CIRCLE_SIZE,
  width: LINE_WIDTH,
  height: 32,
  backgroundColor: "lightgrey",
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 2,
  zIndex: 0,
}

const ROUTE_NAME: TextStyle = {
  fontWeight: "bold",
  marginBottom: spacing[3]
}
// #endregion

type FavoriteRouteBoxProps = {
  id: string
  name: string
  originId: string
  destinationId: string
  onPress: () => void
  style?: ViewStyle
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId, onPress, style, id, name } = props
  const { onLongPress } = useOnLongPress(id, name)

  const [originName, destinationName, stationImage] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]
    const image = stationsObject[originId].image

    return [origin, destination, image]
  }, [])

  return (
    <TouchableScale style={style} activeScale={0.96} friction={8} onPress={onPress} onLongPress={onLongPress}>
      <View style={CONTAINER}>
        <ImageBackground source={stationImage} style={IMAGE_BACKGROUND} borderRadius={10} blurRadius={6} />
        <View style={BACKGROUND_DIMMER} />

        {name ? <Text style={ROUTE_NAME}>{name}</Text> : null}

        <View style={CONTENT}>
          <View style={[STATION_WRAPPER, { marginBottom: spacing[3] }]}>
            <View style={[STATION_CIRCLE, STATION_ORIGIN_CIRCLE]} />
            <Text style={STATION_NAME}>{originName}</Text>
          </View>
          <View style={LINE} />
          <View style={STATION_WRAPPER}>
            <View style={STATION_CIRCLE} />
            <Text style={STATION_NAME}>{destinationName}</Text>
          </View>
        </View>
      </View>
    </TouchableScale>
  )
}

function useOnLongPress(routeId: string, currentName: string) {
  const actionSheet = useActionSheet()
  const { favoriteRoutes } = useStores()

  const onLongPress = () => {
    actionSheet.showActionSheetWithOptions({
      options: [translate("favorites.rename"), translate("common.cancel")],
      title: translate("favorites.favoriteMenuTitle"),
      cancelButtonIndex: 1,
    }, buttonIndex => {
      if (buttonIndex === 0) {
        prompt(translate("favorites.renamePromptTitle"), translate("favorites.renamePromptDescription"), [
          { text: translate("common.cancel"), style: "cancel" },
          {
            text: translate("common.save"),
            onPress: (newName) => {
              favoriteRoutes.rename(routeId, newName)
            },
          },
        ], {
          defaultValue: currentName,
        })
      }
    })
  }

  return {onLongPress}
}
