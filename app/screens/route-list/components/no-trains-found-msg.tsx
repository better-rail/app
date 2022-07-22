import React from "react"
import { Image, View, ViewStyle, ImageStyle } from "react-native"
import { Text } from "../../../components"
import { spacing } from "../../../theme"

const CONTAINER: ViewStyle = {
  alignItems: "center",
}

const SEARCH_ICON: ImageStyle = {
  width: 57.5,
  height: 57.5,
  marginBottom: spacing[2],
  opacity: 0.75,
}

export default function NoTrainsFoundMessage() {
  return (
    <View style={CONTAINER}>
      <Image style={SEARCH_ICON} source={require("../../../../assets/search.png")} />
      <Text style={{ marginBottom: spacing[2] }}>לא נמצאו רכבות למסלול זה בימים הקרובים</Text>
    </View>
  )
}
