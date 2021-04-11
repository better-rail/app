import React from "react"
import { View, ViewStyle } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"

const ROUTE_EXCHANGE_WRAPPER: ViewStyle = {
  height: 50,
  width: "100%",
  backgroundColor: "blue",
}

type RouteExchangeProps = {
  style?: ViewStyle
}

export const RouteExchangeDetails = ({ style }: RouteExchangeProps) => (
  <View style={[style]}>
    <Text>Hi</Text>
  </View>
)
