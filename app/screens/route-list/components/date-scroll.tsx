import React, { useCallback } from "react"
import { View, Image, Pressable, ViewStyle, ImageStyle } from "react-native"

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
  justifyContent: "center",
}

const ARROW_URL = "../../../../assets/chevron.png"

const ARROW_STYLE: ImageStyle = {
  width: 7,
  height: 15,
  tintColor: color.primary,
}

type DateScrollDirection = "Forward" | "Backward"

export const DateScroll = function DateScroll(props: { direction: DateScrollDirection }) {
  const { routePlan } = useStores()

  const setNewDate = useCallback(
    (value: number) => {
      routePlan.setDate(routePlan.date.setDate(routePlan.date.getDate() + value))
    },
    [routePlan.date],
  )

  return (
    <View style={CONTAINER_STYLE}>
      {props.direction === "Backward" ? (
        <>
          <Pressable style={PRESSABLE_STYLE} onPress={() => setNewDate(-1)}>
            <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "90deg" }] }} />
            <Text text={routePlan.date.toDateString()} style={{ width: "40%", textAlign: "center", color: color.primary }} />
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={PRESSABLE_STYLE} onPress={() => setNewDate(1)}>
            <Text
              text={new Date(routePlan.date.setDate(routePlan.date.getDate() + 1)).toDateString()}
              style={{ width: "40%", textAlign: "center", color: color.primary }}
            />
            <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "-90deg" }] }} />
          </Pressable>
        </>
      )}
    </View>
  )
}
