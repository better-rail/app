import React from "react"
import { View, ViewStyle, ImageBackground, Platform, Alert, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale from "react-native-touchable-scale"
import Sortable from "react-native-sortables"
import { Text } from "@/components/text/text"
import { stationLocale, stationsObject } from "@/data/stations"
import { translate } from "@/i18n"
import { useActionSheet } from "@expo/react-native-action-sheet"
import { getActionSheetStyleOptions } from "@/utils/helpers/action-sheet-helpers"
import prompt from "react-native-prompt-android"
import { useShallow } from "zustand/react/shallow"
import { useFavoritesStore } from "@/models"
import { ContextMenu, type ContextMenuAction } from "@/components/context-menu/context-menu"
import { IS_E2E } from "@/config/e2e"

const borderRadius = Platform.select({ ios: 10, android: 6 })

type FavoriteRouteBoxProps = {
  id: string
  label?: string
  originId: string
  destinationId: string
  onPress: () => void
  // Enters reorder mode; omitted when there's nothing to reorder
  onReorder?: () => void
  isEditing?: boolean
  style?: ViewStyle
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId, onPress, onReorder, isEditing = false, style, id, label } = props
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

  const { onLongPress } = useOnLongPress(label, renamePrompt, deleteRoute, onReorder)

  const [originName, destinationName, stationImage] = (() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]
    const image = stationsObject[originId].image

    return [origin, destination, image]
  })()

  const reorderActions: ContextMenuAction[] = onReorder
    ? [{ title: translate("favorites.reorder") ?? "", systemIcon: "arrow.up.arrow.down", onPress: onReorder }]
    : []

  return (
    <ContextMenu
      disabled={IS_E2E || isEditing}
      actions={[
        {
          title: label ? translate("favorites.changeLabel") : translate("favorites.addLabel"),
          systemIcon: "pencil",
          onPress: renamePrompt,
        },
        ...reorderActions,
        {
          title: translate("favorites.delete") ?? "",
          systemIcon: "star.slash",
          destructive: true,
          onPress: deleteRoute,
        },
      ]}
      previewBorderRadius={12}
      fillWidth
    >
      <TouchableScale
        testID={`favorite-route-${id}`}
        style={style}
        activeScale={0.96}
        friction={8}
        tension={Platform.select({ ios: 8, android: undefined })}
        disabled={isEditing}
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

          {isEditing && (
            <Sortable.Handle style={styles.handle}>
              <View
                testID={`favorite-route-handle-${id}`}
                style={styles.handleLines}
                hitSlop={8}
                accessibilityLabel={translate("favorites.reorderHandle") ?? ""}
              >
                <View style={styles.handleLine} />
                <View style={styles.handleLine} />
                <View style={styles.handleLine} />
              </View>
            </Sortable.Handle>
          )}
        </View>
      </TouchableScale>
    </ContextMenu>
  )
}

function useOnLongPress(
  currentLabel: string | undefined,
  renamePrompt: () => void,
  deleteRoute: () => void,
  onReorder?: () => void,
) {
  const actionSheet = useActionSheet()
  const colorScheme = useColorScheme()

  const onLongPress = () => {
    const actions = [
      { title: currentLabel ? translate("favorites.changeLabel") : translate("favorites.addLabel"), onPress: renamePrompt },
      ...(onReorder ? [{ title: translate("favorites.reorder"), onPress: onReorder }] : []),
      { title: translate("common.delete"), onPress: deleteRoute },
    ]
    const options = [...actions.map((action) => action.title), translate("common.cancel")]
    const destructiveButtonIndex = actions.length - 1
    const cancelButtonIndex = actions.length

    actionSheet.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
        cancelButtonIndex,
        ...getActionSheetStyleOptions(colorScheme),
      },
      (buttonIndex) => {
        if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) return
        actions[buttonIndex]?.onPress()
      },
    )
  }

  return { onLongPress }
}

const styles = StyleSheet.create((theme, rt) => {
  const stationCircleSize = 14 * rt.fontScale
  const lineWidth = 2.5 * rt.fontScale

  return {
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
    handle: {
      position: "absolute",
      top: 0,
      bottom: 0,
      end: 0,
      width: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    handleLines: {
      gap: 4,
      padding: theme.spacing[2],
    },
    handleLine: {
      width: 20,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: theme.colors.whiteText,
      opacity: 0.85,
    },
    routeLabel: {
      color: theme.colors.whiteText,
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: theme.spacing[2],
    },
  }
})
