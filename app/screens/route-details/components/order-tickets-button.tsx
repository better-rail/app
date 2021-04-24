import React from "react"
import {
  Image,
  View,
  ViewStyle,
  ImageStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  TextStyle,
  Platform,
  PlatformColor,
} from "react-native"
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
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 1,
  shadowOpacity: 0.35,
  borderWidth: Platform.select({ android: 1, ios: 0 }),
  borderColor: color.primaryDarker,
  elevation: 5,
}

const ORDER_TICKETS_ICON_IMAGE: ImageStyle = {
  width: 32.5,
  height: 32.5,
  tintColor: color.whiteText,
}

const ORDER_TICKETS_TEXT_WRAPPER: ViewStyle = {
  minWidth: 200,
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
  elevation: 5,
  borderWidth: Platform.select({ android: 1, ios: 0 }),
  borderColor: color.primaryDarker,
  zIndex: 0,
}

const ORDER_TICKETS_TEXT: TextStyle = {
  color: color.whiteText,
  fontWeight: "700",
}

interface OrderTicketsButtonProps extends TouchableOpacityProps {
  existingTicket?: boolean
  styles?: ViewStyle
}

export const OrderTicketsButton = ({ existingTicket, styles, ...rest }: OrderTicketsButtonProps) => {
  return (
    <TouchableOpacity activeOpacity={0.9} style={[ORDER_TICKETS_WRAPPER, styles]} {...rest}>
      <View style={[ORDER_TICKETS_ICON_WRAPPER, existingTicket && { backgroundColor: color.success }]}>
        <Image source={ticketsIcon} style={ORDER_TICKETS_ICON_IMAGE} />
      </View>
      <View style={[ORDER_TICKETS_TEXT_WRAPPER, existingTicket && { backgroundColor: color.success }]}>
        <Text style={ORDER_TICKETS_TEXT}>{existingTicket ? "צפייה בשובר כניסה" : "הזמנת שובר כניסה"}</Text>
      </View>
    </TouchableOpacity>
  )
}
