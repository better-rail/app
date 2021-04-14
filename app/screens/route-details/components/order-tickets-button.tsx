import React from "react"
import { Image, Linking, View, ViewStyle, ImageStyle, TouchableOpacity, TextStyle } from "react-native"
import { Text } from "../../../components"
import { color } from "../../../theme"

const ticketsIcon = require("../../../../assets/tickets.png")

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
  width: 200,
  height: 45,
  paddingStart: 50,
  paddingEnd: 20,
  start: -45,
  justifyContent: "center",
  backgroundColor: color.primary,
  borderRadius: 50,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 1,
  shadowOpacity: 0.5,
  zIndex: 0,
}

const ORDER_TICKETS_TEXT: TextStyle = { color: color.secondaryBackground, fontWeight: "700" }

type OrderTicketsButtonProps = { orderLink: string; styles?: ViewStyle }

export const OrderTicketsButton = ({ orderLink, styles }: OrderTicketsButtonProps) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(orderLink)} style={[ORDER_TICKETS_WRAPPER, styles]}>
    <View style={ORDER_TICKETS_ICON_WRAPPER}>
      <Image source={ticketsIcon} style={ORDER_TICKETS_ICON_IMAGE} />
    </View>
    <View style={ORDER_TICKETS_TEXT_WRAPPER}>
      <Text style={ORDER_TICKETS_TEXT}>הזמנת שובר כניסה</Text>
    </View>
  </TouchableOpacity>
)
