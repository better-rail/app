import { Platform, TextStyle } from "react-native"
import { typography } from "./typography"

export const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
  marginBottom: 8,
}

export const androidTitleStyle: TextStyle = {
  marginLeft: -6,
  marginBottom: 7.5,
  marginTop: 40
}

export const headerTitleStyle = Platform.select({ 
  ios: iOSTitleStyle, 
  android: androidTitleStyle 
})

export const androidHeaderOptions = {
  headerLeftContainerStyle: { marginTop: 40, marginBottom: 6 },
  headerRightContainerStyle: { marginTop: 40 },
  headerStyle: { height: 96 },
}
