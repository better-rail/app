import { useState } from "react"
import { Pressable, View, Animated as RNAnimated } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Text } from "@/components/text/text"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported, useGlassTint } from "@/utils/liquid-glass"
import { subheadingFontStyle } from "@/theme/theme-fonts"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)

interface RouteStationNameButtonProps extends TouchableScaleProps {
  disabled: boolean
  onPress: () => void
  name: string
  /** Shown instead of `name` when the full name would wrap to a second line. */
  shortName?: string
  buttonScale: RNAnimated.Value
}

export function RouteStationNameButton(props: RouteStationNameButtonProps) {
  const { disabled, onPress, name, shortName, style, buttonScale, ...rest } = props
  const glassTint = useGlassTint("secondaryLighter")

  if (isLiquidGlassSupported) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
      >
        <GlassView isInteractive={!disabled} tintColor={glassTint} style={styles.liquidGlass}>
          <StationName key={name} name={name} shortName={shortName} />
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
      <StationName key={name} name={name} shortName={shortName} />
    </AnimatedTouchable>
  )
}

function StationName({ name, shortName }: { name: string; shortName?: string }) {
  // Unknown until the hidden copy is measured; keyed by `name` so each station measures afresh.
  const [fullNameFits, setFullNameFits] = useState<boolean>()

  if (!shortName) {
    return (
      <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
        {name}
      </Text>
    )
  }

  return (
    <View>
      {/* Holds the one-line short name invisibly until measured, so the full name never flashes wrapped. */}
      <Text style={[styles.routeDetailsStationText, fullNameFits === undefined && styles.hiddenText]} maxFontSizeMultiplier={1.1}>
        {fullNameFits ? name : shortName}
      </Text>

      {/* A hidden copy of the full name, measured at the button's width to decide which name to show. */}
      <Text
        style={[styles.routeDetailsStationText, styles.hiddenText, styles.measureText]}
        maxFontSizeMultiplier={1.1}
        onTextLayout={(event) => setFullNameFits(event.nativeEvent.lines.length <= 1)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {name}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  routeDetailsStationText: {
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: "center",
    ...subheadingFontStyle(theme, 14, "600"),
  },
  hiddenText: {
    opacity: 0,
  },
  measureText: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  liquidGlass: {
    width: rt.screen.width / 2 - theme.spacing[2] * 2,
    padding: theme.spacing[2],
    borderRadius: 25,
  },
}))
