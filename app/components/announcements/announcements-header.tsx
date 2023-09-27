import { View, Image, ViewStyle } from "react-native"
import { spacing, color } from "../../theme"
import { Text } from "../text/text"

const SEPARATOR_STYLE: ViewStyle = {
  backgroundColor: color.separator,
  height: 1,
  width: "100%",
  marginVertical: spacing[4],
}

type AnnouncementsHeaderProps = {
  separator?: "top" | "bottom"
}

export const AnnouncementsHeader: React.FC<AnnouncementsHeaderProps> = ({ separator }) => {
  return (
    <>
      {separator === "top" && <View style={SEPARATOR_STYLE} />}
      <View style={{ width: "100%", marginBottom: spacing[4], flexDirection: "row", alignItems: "center" }}>
        <Image
          style={{ width: 20, height: 20, marginEnd: spacing[2], tintColor: color.text }}
          source={require("../../../assets/info.png")}
        />
        <Text tx="routes.updates" style={{ fontWeight: "500" }} />
      </View>
      {separator === "bottom" && <View style={SEPARATOR_STYLE} />}
    </>
  )
}
