import { TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"

const LONG_ROUTE_WARNING_WRAPPER: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing[4],
  backgroundColor: color.secondary,
  width: "100%",
}

const LONG_ROUTE_WARNING_TITLE: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
}
const LONG_ROUTE_WARNING_TEXT: TextStyle = {
  paddingHorizontal: spacing[5],
  marginBottom: spacing[3],
  textAlign: "center",
}

export const LongRouteWarning = () => (
  <View style={LONG_ROUTE_WARNING_WRAPPER}>
    <Text style={{ fontSize: 48 }}>🕰</Text>
    <Text style={LONG_ROUTE_WARNING_TITLE} tx="routeDetails.routeWarning" />
    <Text style={LONG_ROUTE_WARNING_TEXT} tx="routeDetails.routeWarningText" />
  </View>
)
