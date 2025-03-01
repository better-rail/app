import React, { useCallback } from "react"
import { View, Image, Pressable, ViewStyle, ImageStyle, TextStyle, ActivityIndicator } from "react-native"

import { color } from "../../../theme"
import { Text } from "../../../components"
import { useStores } from "../../../models"

const CONTAINER_STYLE: ViewStyle = {
  height: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
}

const PRESSABLE_STYLE: ViewStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-around",
}

const DISABLED_STYLE: ViewStyle = {
  opacity: 0.5,
}

const ARROW_URL = "../../../../assets/chevron.png"

const ARROW_STYLE: ImageStyle = {
  width: 7,
  height: 15,
  tintColor: color.primary,
}

const INDICATOR_CONTAINER: ViewStyle = {
  width: 7,
  height: 15,
  alignItems: "center",
  justifyContent: "center",
}

const LINE_STYLE: ViewStyle = {
  width: "25%",
  borderWidth: 1,
  borderColor: "#2196f3",
}

const DATE_STYLE: ViewStyle = {
  elevation: 6,
  width: "50%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-evenly",
}

const TEXT_STYLE: TextStyle = {
  width: "70%",
  textAlign: "center",
  color: color.primary,
}

type DateScrollDirection = "forward" | "backward"

export const DateScroll = function DateScroll(props: {
  direction: DateScrollDirection
  setTime: () => void
  currenTime: number
  isLoadingDate?: boolean
}) {
  const { trainRoutes } = useStores()
  const isLoading = trainRoutes.status === "pending" || props.isLoadingDate

  // This date is already the target date for the direction (forward or backward)
  const getDateString = useCallback(() => {
    return new Date(props.currenTime).toDateString()
  }, [props.currenTime])

  const handlePress = useCallback(() => {
    // Don't allow new requests while loading
    if (isLoading) return

    // Call the callback to load data for this direction
    props.setTime()
  }, [props.setTime, isLoading])

  return (
    <View style={CONTAINER_STYLE}>
      {props.direction === "backward" ? (
        <>
          <Pressable style={[PRESSABLE_STYLE, isLoading && DISABLED_STYLE]} onPress={handlePress} disabled={isLoading}>
            <View style={LINE_STYLE}></View>
            <View style={DATE_STYLE}>
              <Text text={getDateString()} style={TEXT_STYLE} />
              {isLoading ? (
                <View style={INDICATOR_CONTAINER}>
                  <ActivityIndicator size="small" color={color.primary} />
                </View>
              ) : (
                <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "90deg" }] }} />
              )}
            </View>
            <View style={LINE_STYLE}></View>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={[PRESSABLE_STYLE, isLoading && DISABLED_STYLE]} onPress={handlePress} disabled={isLoading}>
            <View style={LINE_STYLE}></View>
            <View style={DATE_STYLE}>
              <Text text={getDateString()} style={TEXT_STYLE} />
              {isLoading ? (
                <View style={INDICATOR_CONTAINER}>
                  <ActivityIndicator size="small" color={color.primary} />
                </View>
              ) : (
                <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "-90deg" }] }} />
              )}
            </View>
            <View style={LINE_STYLE}></View>
          </Pressable>
        </>
      )}
    </View>
  )
}
