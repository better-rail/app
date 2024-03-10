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
  marginBottom: spacing[4],
  tintColor: color.dim,
  opacity: 0.75,
}

const TEXT: TextStyle = {
  textAlign: "center",
}

type Props = {
  errorType: "no-internet" | "request-error"
}

export const RouteListError: React.FC<Props> = function NoInternetConnection({ errorType }) {
  const imageSrc =
    errorType === "no-internet" ? require("../../../../assets/no-connection.png") : require("../../../../assets/info.png")

  const textKey = errorType === "no-internet" ? "routes.noInternetConnection" : "routes.routesError"

  return (
    <View style={MESSAGE_WRAPPER}>
      <Image source={imageSrc} style={[ICON, { height: errorType === "no-internet" ? 36 : 45 }]} />
      <Text style={TEXT} tx={textKey} />
    </View>
  )
}
