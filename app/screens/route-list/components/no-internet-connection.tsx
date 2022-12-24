import React from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../../components"
import { spacing, color } from "../../../theme"

const MESSAGE_WRAPPER: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing[8],
  paddingHorizontal: spacing[5],
}

const ICON: ImageStyle = {
  width: 45,
  height: 36,
  marginBottom: spacing[4],
  tintColor: color.dim,
  opacity: 0.75,
}

const TEXT: TextStyle = {
  textAlign: "center",
}

export const NoInternetConnection = function NoInternetConnection() {
  return (
    <View style={MESSAGE_WRAPPER}>
      <Image source={require("../../../../assets/no-connection.png")} style={ICON} />
      <Text style={TEXT} tx="routes.noInternetConnection" />
    </View>
  )
}
