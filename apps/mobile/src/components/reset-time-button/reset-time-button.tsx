import { TouchableOpacity, TouchableOpacityProps, Image, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { spacing } from "@/theme"
import { translate } from "@/i18n"

const ResetTimeIcon = Platform.select({
  ios: require("../../../assets/reset-time.ios.png"),
  android: require("../../../assets/reset-time.android.png"),
})

export const ResetTimeButton: React.FC<TouchableOpacityProps> = (props) => {
  const { onPress, ...rest } = props

  return (
    <TouchableOpacity hitSlop={spacing[4]} onPress={onPress} accessibilityLabel={translate("plan.resetTime")} {...rest}>
      <Image source={ResetTimeIcon} style={[styles.resetTimeIcon]} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  resetTimeIcon: {
    height: rt.fontScale * 22,
    width: rt.fontScale * 22,
    resizeMode: "contain",
    tintColor: theme.colors.text,
  },
}))
