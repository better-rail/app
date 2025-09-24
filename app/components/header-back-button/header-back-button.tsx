import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"
import { Pressable, Image, ImageStyle, Platform, View } from "react-native"
import { isRTL } from "../../i18n"
import { spacing } from "../../theme"
import { useNavigation } from "@react-navigation/native"
import { ViewStyle } from "react-native"
import { HeaderBackButton as BackButton } from "@react-navigation/elements"

const CHEVRON = require("../../../assets/chevron.png")

const LIQUID_WRAPPER: ViewStyle = {
  width: 45,
  height: 45,
  borderRadius: 50,
  justifyContent: "center",
  alignItems: "center",
}

const ICON: ImageStyle = {
  width: 10,
  height: 18,
  marginLeft: -spacing[0],
  tintColor: "lightgrey",
  opacity: 0.9,
  transform: isRTL ? [{ rotate: "180deg" }] : [{ rotate: "0deg" }],
}

export function HeaderBackButton() {
  const navigation = useNavigation()

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={() => navigation.goBack()}>
        <LiquidGlassView interactive style={LIQUID_WRAPPER}>
          <Image source={CHEVRON} style={ICON} />
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <View style={Platform.select({ android: { marginLeft: -spacing[4] }, ios: { marginLeft: -spacing[3] } })}>
      <BackButton tintColor="rgba(211, 211, 211, 0.9)" onPress={() => navigation.goBack()} />
    </View>
  )
}
