import React, { useCallback } from "react"
import { View, Image, Pressable, ViewStyle, ImageStyle, TextStyle } from "react-native"

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

const ARROW_URL = "../../../../assets/chevron.png"

const ARROW_STYLE: ImageStyle = {
  width: 7,
  height: 15,
  tintColor: color.primary,
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

type DateScrollDirection = "Forward" | "Backward"

export const DateScroll = function DateScroll(props: { direction: DateScrollDirection }) {
  const { routePlan } = useStores()

  const getNewDate = useCallback(
    (value: number) => {
      const newDate = new Date(routePlan.date)
      newDate.setDate(newDate.getDate() + value)

      return newDate
    },
    [routePlan.date],
  )

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
            <View style={LINE_STYLE}></View>
            <View style={DATE_STYLE}>
              <Text text={getNewDate(-1).toDateString()} style={TEXT_STYLE} />
              <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "90deg" }] }} />
            </View>
            <View style={LINE_STYLE}></View>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={PRESSABLE_STYLE} onPress={() => setNewDate(1)}>
            <View style={LINE_STYLE}></View>
            <View style={DATE_STYLE}>
              <Text text={getNewDate(1).toDateString()} style={TEXT_STYLE} />
              <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "-90deg" }] }} />
            </View>
            <View style={LINE_STYLE}></View>
          </Pressable>
        </>
      )}
    </View>
  )
}
