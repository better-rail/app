import React from "react"
import { Pressable, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Svg, Line, Circle } from "react-native-svg"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "@/i18n"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

export interface FilterIconProps {
  style?: ViewStyle
  onPress: () => void
  active: boolean
}

const ICON_COLOR = "lightgrey"
const ACTIVE_COLOR = "#ff9500"

function FilterGlyph({ active }: { active: boolean }) {
  return (
    <Svg width={27} height={27} viewBox="0 0 24 24" opacity={0.9} accessible={false}>
      <Line x1={3} y1={7} x2={21} y2={7} stroke={ICON_COLOR} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={6} y1={12} x2={18} y2={12} stroke={ICON_COLOR} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={9} y1={17} x2={15} y2={17} stroke={ICON_COLOR} strokeWidth={2.5} strokeLinecap="round" />
      {active && <Circle cx={20} cy={17} r={3} fill={ACTIVE_COLOR} />}
    </Svg>
  )
}

export function FilterIcon(props: FilterIconProps) {
  const { onPress, active, style } = props

  if (isLiquidGlassSupported) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.container, style]}
        accessibilityRole="button"
        accessibilityLabel={translate("routes.filter")}
        accessibilityState={{ selected: active }}
      >
        <LiquidGlassView interactive colorScheme="dark" tintColor="rgba(51, 51, 51, 0.9)" style={styles.liquidGlass}>
          <FilterGlyph active={active} />
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={translate("routes.filter")}
      accessibilityState={{ selected: active }}
      hitSlop={10}
    >
      <FilterGlyph active={active} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create(() => ({
  container: {
    justifyContent: "center",
  },
  liquidGlass: {
    padding: 8.5,
    borderRadius: 50,
  },
}))
