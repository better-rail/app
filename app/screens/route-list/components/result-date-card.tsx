import { TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"

const DATE_TEXT_STYLES: TextStyle = {
  color: color.primary,
}

const DATE_CONTAINER_STYLES: ViewStyle = {
  display: "flex",
  alignItems: "center",
  alignContent: "center",
  paddingBottom: spacing[2],
  height: "100%",
  justifyContent: "center",
}

export const ResultDateCard = function ResultDateCard(props: { date: string }) {
  return (
    <View style={DATE_CONTAINER_STYLES}>
      <Text text={props.date} style={DATE_TEXT_STYLES} />
    </View>
  )
}
