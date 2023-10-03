import React, { Dispatch, SetStateAction, useCallback } from "react"
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

type DateScrollDirection = "forward" | "backward"

export const DateScroll = function DateScroll(props: {
  direction: DateScrollDirection
  setTime: Dispatch<SetStateAction<number>>
  currenTime: number
}) {
  const getNewDate = useCallback(
    (value: number) => {
      const newDate = new Date(props.currenTime)
      newDate.setDate(newDate.getDate() + value)

      return newDate
    },
    [props.currenTime],
  )

  const setNewDate = useCallback(
    (value: number) => {
      props.setTime((currentTime) => {
        const currentDate = new Date(currentTime)
        currentDate.setDate(currentDate.getDate() + value)
        return currentDate.getTime()
      })
    },
    [props.currenTime],
  )

  return (
    <View style={CONTAINER_STYLE}>
      {props.direction === "backward" ? (
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
