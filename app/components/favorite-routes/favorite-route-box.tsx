import React, { useMemo } from "react"
import { View, ViewStyle, TextStyle, ImageBackground, ImageStyle, Platform, StyleSheet, Alert } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing, fontScale } from "../../theme"
import { translate } from "../../i18n"
import { useActionSheet } from "@expo/react-native-action-sheet"
import prompt from "react-native-prompt-android"
import { useStores } from "../../models"
import { ContextMenuView } from "react-native-ios-context-menu"

const borderRadius = Platform.select({ ios: 8, android: 6 })

// #region styles
const CONTAINER: ViewStyle = {
  padding: spacing[3],
}

const IMAGE_BACKGROUND: ImageStyle = {
  ...StyleSheet.absoluteFillObject,
  justifyContent: "center",
  borderRadius: borderRadius,
  overflow: "hidden",
}

const BACKGROUND_DIMMER: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  borderRadius: borderRadius,
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
  top: STATION_CIRCLE_SIZE + 4.75,
  width: LINE_WIDTH,
  height: 32,
  backgroundColor: "lightgrey",
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 2,
  zIndex: 0,
}

const ROUTE_LABEL: TextStyle = {
  color: color.whiteText,
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: spacing[2],
}
// #endregion

type FavoriteRouteBoxProps = {
  id: string
  label: string
  originId: string
  destinationId: string
  onPress: () => void
  style?: ViewStyle
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId, onPress, style, id, label } = props
  const { favoriteRoutes } = useStores()

  const renamePrompt = () => {
    prompt(
      translate("favorites.renamePromptTitle"),
      undefined,
      [
        { text: translate("common.cancel"), style: "cancel" },
        {
          text: translate("common.save"),
          onPress: (newLabel) => {
            favoriteRoutes.rename(id, newLabel)
          },
        },
      ],
      { defaultValue: label, placeholder: translate("favorites.renamePromptPlaceholder") },
    )
  }

  const deleteRoute = () => {
    Alert.alert(translate("favorites.delete"), translate("common.areYouSure"), [
      { text: translate("common.delete"), onPress: () => favoriteRoutes.remove(id), style: "destructive" },
      { text: translate("common.cancel"), style: "cancel" },
    ])
  }

  const { onLongPress } = useOnLongPress(label, renamePrompt, deleteRoute)

  const [originName, destinationName, stationImage] = useMemo(() => {
    const origin = stationsObject[originId]?.[stationLocale] || 'Unknown Station'
    const destination = stationsObject[destinationId]?.[stationLocale] || 'Unknown Station'
    const image = stationsObject[originId]?.image

    return [origin, destination, image]
  }, [])

  return (
    <ContextMenuView
      onPressMenuItem={({ nativeEvent }) => {
        const { actionKey } = nativeEvent

        if (actionKey === "route-label") {
          renamePrompt()
        } else if (actionKey === "delete-favorite") {
          deleteRoute()
        }
      }}
      previewConfig={{ borderRadius: 6 }}
      menuConfig={{
        menuTitle: "",
        menuItems: [
          {
            actionKey: "route-label",
            actionTitle: label ? translate("favorites.changeLabel") : translate("favorites.addLabel"),
            icon: {
              iconType: "SYSTEM",
              iconValue: "pencil",
            },
          },
          {
            actionKey: "delete-favorite",
            actionTitle: translate("favorites.delete"),
            menuAttributes: ["destructive"],
            icon: {
              iconType: "SYSTEM",
              iconValue: "star.slash",
            },
          },
        ],
      }}
      style={{ marginBottom: spacing[4] }}
    >
      <TouchableScale
        style={style}
        activeScale={0.96}
        friction={8}
        tension={Platform.select({ ios: 8, android: undefined })}
        onPress={onPress}
        onLongPress={Platform.OS === "android" ? onLongPress : undefined}
      >
        <View style={CONTAINER}>
          <ImageBackground source={stationImage} style={IMAGE_BACKGROUND} blurRadius={6} />
          <View style={BACKGROUND_DIMMER} />

          {label ? <Text style={ROUTE_LABEL}>{label}</Text> : null}

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
    </ContextMenuView>
  )
}

function useOnLongPress(currentLabel: string, renamePrompt: () => void, deleteRoute: () => void) {
  const actionSheet = useActionSheet()

  const onLongPress = () => {
    actionSheet.showActionSheetWithOptions(
      {
        options: [
          currentLabel ? translate("favorites.changeLabel") : translate("favorites.addLabel"),
          translate("common.delete"),
        ],
        destructiveButtonIndex: 1,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          renamePrompt()
        } else if (buttonIndex === 1) {
          deleteRoute()
        }
      },
    )
  }

  return { onLongPress }
}
