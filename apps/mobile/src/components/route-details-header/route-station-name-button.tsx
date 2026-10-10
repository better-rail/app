import { Pressable, Animated as RNAnimated } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Text } from "@/components/text/text"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported, useGlassTint } from "@/utils/liquid-glass"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)

interface RouteStationNameButtonProps extends TouchableScaleProps {
  disabled: boolean
  onPress: () => void
  name: string
  buttonScale: RNAnimated.Value
}

export function RouteStationNameButton(props: RouteStationNameButtonProps) {
  const { disabled, onPress, name, style, buttonScale, ...rest } = props
  const glassTint = useGlassTint("secondaryLighter")

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        <GlassView isInteractive={!disabled} tintColor={glassTint} style={styles.liquidGlass}>
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
      style={[style, { transform: [{ scale: buttonScale }] }]}
      {...rest}
    >
      <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
        {name}
      </Text>
    </AnimatedTouchable>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  routeDetailsStationText: {
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  liquidGlass: {
    width: rt.screen.width / 2 - theme.spacing[2] * 2,
    padding: theme.spacing[2],
    borderRadius: 25,
  },
}))
