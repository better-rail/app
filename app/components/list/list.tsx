import { ViewStyle, View } from "react-native"
import { color } from "../../theme"

const LIST_WRAPPER: ViewStyle = {
  marginHorizontal: 16,
  borderRadius: 14,
  backgroundColor: color.tertiaryBackground,
}

export const List = ({ children }) => {
  return <View style={LIST_WRAPPER}>{children}</View>
}
