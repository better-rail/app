import React, { useMemo } from "react"
import { Image, Pressable, type ImageStyle, type ViewStyle } from "react-native"
import { AccessibilityState } from "react-native"
import { translate } from "../../i18n"
import { color } from "../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const starImage = require("../../../assets/star.png")

const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

const STAR_ICON: ImageStyle = {
  width: 27,
  height: 25,
  resizeMode: "contain",
  tintColor: "lightgrey",
  opacity: 0.9,
}

export interface StarIconProps {
  style?: ViewStyle
  onPress: () => void

  /**
   * Whether the star is outlined or filled
   */
  filled: boolean
}

export function StarIcon(props: StarIconProps) {
  const { onPress, filled, style } = props

  const [STAR_ICON_SOURCE, STAR_STATE_STYLE] = useMemo(() => {
    let STAR_STATE_STYLE: ImageStyle = { tintColor: "lightgrey" }

    if (filled) {
      STAR_STATE_STYLE = { tintColor: color.yellow, opacity: 0.75 }
    }

    return [STAR_ICON_SOURCE, STAR_STATE_STYLE]
  }, [filled])

  if (isLiquidGlassSupported) {
    return <Pressable onPress={onPress} style={[CONTAINER, style]}>
      <LiquidGlassView interactive colorScheme="dark" tintColor="rgba(51, 51, 51, 0.9)" style={{ padding: 10, borderRadius: 50 }}>
        <Image source={starImage} style={[STAR_ICON, STAR_STATE_STYLE]} accessible={false} />
      </LiquidGlassView>
    </Pressable>
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[CONTAINER, style]}
      accessibilityRole="button"
      accessibilityLabel={translate("favorites.title")}
      accessibilityState={{ selected: filled } as AccessibilityState}
      hitSlop={10}
    >
      <Image source={starImage} style={[STAR_ICON, STAR_STATE_STYLE]} accessible={false} />
    </TouchableOpacity>
  )
}
