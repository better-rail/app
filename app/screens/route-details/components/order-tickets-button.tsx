import React from "react"
import { Image, Linking, View, ViewStyle, ImageStyle, TouchableOpacity, TextStyle } from "react-native"
import { Text } from "../../../components"
import { color } from "../../../theme"

const ORDER_TICKETS_WRAPPER: ViewStyle = {
  position: "absolute",
  flexDirection: "row",
  alignItems: "center",
  zIndex: 100,
  start: 12,
}

const ORDER_TICKETS_ICON_WRAPPER: ViewStyle = {
  backgroundColor: color.primary,
  borderRadius: 50,
  width: 60,
  height: 60,
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 1,
  shadowOpacity: 0.5,
}

const ORDER_TICKETS_ICON_IMAGE: ImageStyle = { width: 32.5, height: 32.5, tintColor: "#fff" }

const ORDER_TICKETS_TEXT_WRAPPER: ViewStyle = {
  justifyContent: "center",
  paddingStart: 50,
  paddingEnd: 20,
  height: 45,
  width: 200,
  backgroundColor: color.primary,
  borderRadius: 50,
  start: -45,
  zIndex: 0,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 1,
  shadowOpacity: 0.5,
}

const ORDER_TICKETS_TEXT: TextStyle = { color: color.secondaryBackground, fontWeight: "700" }

type OrderTicketsButtonProps = { orderLink: string; styles?: ViewStyle }

export const OrderTicketsButton = function OrderTicketsButton({ orderLink, styles }: OrderTicketsButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(orderLink)} style={[ORDER_TICKETS_WRAPPER, styles]}>
      <View style={ORDER_TICKETS_ICON_WRAPPER}>
        <Image source={require("../../../../assets/tickets.png")} style={ORDER_TICKETS_ICON_IMAGE} />
      </View>
      <View style={ORDER_TICKETS_TEXT_WRAPPER}>
        <Text style={ORDER_TICKETS_TEXT}>הזמנת שובר כניסה</Text>
      </View>
    </TouchableOpacity>
  )
}
