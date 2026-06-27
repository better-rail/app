import React, { useMemo } from "react"
import { View, ViewStyle, ImageBackground, Platform, Alert, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "@/components/text/text"
import { stationLocale, stationsObject } from "@/data/stations"
import { translate } from "@/i18n"
import { useActionSheet } from "@expo/react-native-action-sheet"
import { getActionSheetStyleOptions } from "@/utils/helpers/action-sheet-helpers"
import prompt from "react-native-prompt-android"
import { useShallow } from "zustand/react/shallow"
import { useFavoritesStore } from "@/models"
import { ContextMenuView } from "react-native-ios-context-menu"

const borderRadius = Platform.select({ ios: 10, android: 6 })

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
  const { rename, remove } = useFavoritesStore(useShallow((s) => ({ rename: s.rename, remove: s.remove })))

  const renamePrompt = () => {
    prompt(
      translate("favorites.renamePromptTitle"),
      undefined,
      [
        { text: translate("common.cancel"), style: "cancel" },
        {
          text: translate("common.save"),
          onPress: (newLabel) => {
            rename(id, newLabel)
          },
        },
      ],
      { defaultValue: label, placeholder: translate("favorites.renamePromptPlaceholder") },
    )
  }

  const deleteRoute = () => {
    Alert.alert(translate("favorites.delete"), translate("common.areYouSure"), [
      { text: translate("common.delete"), onPress: () => remove(id), style: "destructive" },
      { text: translate("common.cancel"), style: "cancel" },
    ])
  }

  const { onLongPress } = useOnLongPress(label, renamePrompt, deleteRoute)

  const [originName, destinationName, stationImage] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]
    const image = stationsObject[originId].image

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
      previewConfig={{ borderRadius: 12 }}
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
      style={styles.contextMenu}
    >
      <TouchableScale
        style={style}
        activeScale={0.96}
        friction={8}
        tension={Platform.select({ ios: 8, android: undefined })}
        onPress={onPress}
        onLongPress={Platform.OS === "android" ? onLongPress : undefined}
      >
        <View style={styles.container}>
          <ImageBackground source={stationImage} style={[StyleSheet.absoluteFill, styles.imageBackground]} blurRadius={6} />
          <View style={[StyleSheet.absoluteFill, styles.backgroundDimmer]} />

          {label ? <Text style={styles.routeLabel}>{label}</Text> : null}

          <View style={styles.content}>
            <View style={[styles.stationWrapper, styles.stationWrapperOrigin]}>
              <View style={[styles.stationCircle, styles.stationOriginCircle]} />
              <Text style={styles.stationName}>{originName}</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.stationWrapper}>
              <View style={styles.stationCircle} />
              <Text style={styles.stationName}>{destinationName}</Text>
            </View>
          </View>
        </View>
      </TouchableScale>
    </ContextMenuView>
  )
}

function useOnLongPress(currentLabel: string, renamePrompt: () => void, deleteRoute: () => void) {
  const actionSheet = useActionSheet()
  const colorScheme = useColorScheme()

  const onLongPress = () => {
    const options = [
      currentLabel ? translate("favorites.changeLabel") : translate("favorites.addLabel"),
      translate("common.delete"),
      translate("common.cancel"),
    ]
    const destructiveButtonIndex = 1
    const cancelButtonIndex = 2

    actionSheet.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
        cancelButtonIndex,
        ...getActionSheetStyleOptions(colorScheme),
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) return

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

const styles = StyleSheet.create((theme, rt) => {
  const stationCircleSize = 14 * rt.fontScale
  const lineWidth = 2.5 * rt.fontScale

  return {
    contextMenu: {
      marginBottom: theme.spacing[4],
    },
    container: {
      padding: theme.spacing[3],
    },
    imageBackground: {
      justifyContent: "center",
      borderRadius: borderRadius,
      overflow: "hidden",
    },
    backgroundDimmer: {
      borderRadius: borderRadius,
      backgroundColor: "#111",
      opacity: 0.6,
    },
    stationWrapper: {
      flexDirection: "row",
      alignItems: "center",
    },
    stationWrapperOrigin: {
      marginBottom: theme.spacing[3],
    },
    stationName: {
      color: theme.colors.whiteText,
      fontWeight: "500",
      fontSize: 16.5,
      textShadowRadius: 6,
      textShadowColor: "rgba(0,0,0,0.5)",
    },
    stationCircle: {
      width: stationCircleSize,
      height: stationCircleSize,
      marginEnd: theme.spacing[2],
      backgroundColor: "#fff",
      borderWidth: 2,
      borderColor: "lightgrey",
      borderRadius: 10,
      zIndex: 10,
      shadowOffset: { height: 0, width: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
    },
    stationOriginCircle: {
      backgroundColor: theme.colors.secondary,
      borderColor: "#fff",
    },
    content: {
      position: "relative",
    },
    line: {
      position: "absolute",
      start: (stationCircleSize - lineWidth) / 2,
      top: stationCircleSize + 4.75,
      width: lineWidth,
      height: 32,
      backgroundColor: "lightgrey",
      shadowOffset: { height: 0, width: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
      zIndex: 0,
    },
    routeLabel: {
      color: theme.colors.whiteText,
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: theme.spacing[2],
    },
  }
})
