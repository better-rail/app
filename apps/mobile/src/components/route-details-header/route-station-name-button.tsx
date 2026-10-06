import { Pressable, Animated as RNAnimated, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Text } from "@/components/text/text"
import { color } from "@/theme"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)

interface RouteStationNameButtonProps extends TouchableScaleProps {
  disabled: boolean
  onPress: () => void
  name: string
  buttonScale: RNAnimated.Value
  /** Sizes the button within its row, e.g. to line it up with a column below. */
  wrapperStyle?: ViewStyle
}

export function RouteStationNameButton(props: RouteStationNameButtonProps) {
  const { disabled, onPress, name, style, buttonScale, wrapperStyle, ...rest } = props

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={[styles.liquidGlassWrapper, wrapperStyle]}>
        <GlassView isInteractive={!disabled} tintColor={color.secondaryLighter} style={styles.liquidGlass}>
          <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
            {name}
          </Text>
        </GlassView>
      </Pressable>
    )
  }

  return (
    <AnimatedTouchable
      friction={9}
      activeScale={0.95}
      disabled={disabled}
      onPress={onPress}
      style={[style, wrapperStyle, { transform: [{ scale: buttonScale }] }]}
      {...rest}
    >
      <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
        {name}
      </Text>
    </AnimatedTouchable>
  )
}

const styles = StyleSheet.create((theme) => ({
  routeDetailsStationText: {
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  // Share the row with the other station instead of taking half the window, which overflows
  // once the row is narrowed by side safe-area insets (iPhone Duo's side bar column).
  liquidGlassWrapper: {
    flex: 1,
  },
  liquidGlass: {
    padding: theme.spacing[2],
    borderRadius: 25,
  },
}))
