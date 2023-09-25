import React, { useCallback } from "react"
import { View, Image, Pressable, ViewStyle, ImageStyle } from "react-native"

import { Text } from "../../../components"
import { useStores } from "../../../models"

const CONTAINER_STYLE: ViewStyle = {
  elevation: 6,
  height: "7%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
}

const PRESSABLE_STYLE: ViewStyle = {
  width: "10%",
}

const ARROW_URL = "../../../../assets/arrow-left.png"

const ARROW_STYLE: ImageStyle = {
  height: "50%",
  width: "100%",
}

export const DateScroll = function DateScroll() {
  const { routePlan } = useStores()

  const setNewDate = useCallback(
    (value: number) => {
      routePlan.setDate(routePlan.date.setDate(routePlan.date.getDate() + value))
    },
    [routePlan.date],
  )

  return (
    <View style={CONTAINER_STYLE}>
      <Pressable style={PRESSABLE_STYLE} onPress={() => setNewDate(-1)}>
        <Image source={require(ARROW_URL)} style={ARROW_STYLE} />
      </Pressable>
      <Text text={routePlan.date.toDateString()} style={{ width: "40%", textAlign: "center" }} />
      <Pressable style={PRESSABLE_STYLE} onPress={() => setNewDate(1)}>
        <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "180deg" }] }} />
      </Pressable>
    </View>
  )
}
