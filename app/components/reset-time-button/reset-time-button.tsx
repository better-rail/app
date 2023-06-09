import { TouchableOpacity, TouchableOpacityProps, Image, ImageStyle, Platform } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { translate } from "../../i18n"

const ResetTimeIcon = Platform.select({
  ios: require("../../../assets/reset-time.ios.png"),
  android: require("../../../assets/reset-time.android.png"),
})

const RESET_TIME_ICON_STYLE: ImageStyle = {
  height: fontScale > 1.2 ? 28 : 24,
  width: fontScale > 1.2 ? 28 : 24,
  resizeMode: "contain",
  tintColor: color.text,
}

export const ResetTimeButton: React.FC<TouchableOpacityProps> = (props) => {
  const { onPress, ...rest } = props

  return (
    <TouchableOpacity hitSlop={spacing[4]} onPress={onPress} accessibilityLabel={translate("plan.resetTime")} {...rest}>
      <Image source={ResetTimeIcon} style={[RESET_TIME_ICON_STYLE]} />
    </TouchableOpacity>
  )
}
