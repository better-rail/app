import React from "react"
import { Image, View, ViewStyle, ImageStyle, TouchableHighlight, TouchableHighlightProps, Platform, Switch } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { isRTL } from "@/i18n"
import { color, spacing } from "@/theme"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"
import { settingsBorderRadius } from "@/screens/settings/settings-styles"

const chevronIcon = require("../../../../assets/chevron.png")
const checkmarkIcon = require("../../../../assets/checkmark.png")
const externalLinkIcon = require("../../../../assets/external-link.png")

/**
 * Plain (non-Unistyles) style kept because it's exported and shared cross-file
 * (e.g. the paywall features box layers it inside a style array).
 */
export const CHEVRON_ICON: ImageStyle = {
  width: 8,
  height: 16,
  marginEnd: spacing[2],
  tintColor: color.dim,
  opacity: 0.6,
  transform: isRTL ? undefined : [{ rotate: "180deg" }],
}

export interface SettingBoxProps extends TouchableHighlightProps {
  title: string
  icon?: string
  first?: boolean
  last?: boolean
  checkmark?: boolean
  chevron?: boolean
  externalLink?: boolean

  /**
   * Switch component props
   */
  toggle?: boolean
  onToggle?: (value: boolean) => void
  toggleValue?: boolean
}

export const SettingBox = function SettingBox(props: SettingBoxProps) {
  const { title, icon, first, last, externalLink, chevron, checkmark, onPress, toggle, style } = props
  let boxStyle: ViewStyle = {}

  if (!first && Platform.OS === "ios") boxStyle = { borderTopColor: color.background, borderTopWidth: 1 }

  if (first) {
    boxStyle = { borderTopLeftRadius: settingsBorderRadius, borderTopRightRadius: settingsBorderRadius, ...boxStyle }
  }

  if (last) {
    boxStyle = { borderBottomLeftRadius: settingsBorderRadius, borderBottomRightRadius: settingsBorderRadius, ...boxStyle }
  }

  return (
    <TouchableHighlight
      underlayColor={color.inputPlaceholderBackground}
      onPress={onPress}
      style={[styles.settingsBoxBase, boxStyle, style]}
    >
      <View style={styles.settingsBoxWrapper}>
        <View style={styles.settingsBoxDetails}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.settingsBoxTitle}>{title}</Text>
        </View>

        {externalLink && <Image style={styles.externalLinkIcon} source={externalLinkIcon} />}
        {chevron && <Image style={CHEVRON_ICON} source={chevronIcon} />}
        {checkmark && <Image style={styles.checkmarkIcon} source={checkmarkIcon} />}
        {toggle && <Switch value={props.toggleValue} onValueChange={props.onToggle} style={styles.switch} />}
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  settingsBoxBase: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  settingsBoxWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  settingsBoxDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsBoxTitle: { marginStart: theme.spacing[2], fontSize: 16.5, fontWeight: "400" },
  icon: { fontSize: 18 },
  checkmarkIcon: {
    width: 19.5,
    height: 19.5,
    marginEnd: theme.spacing[1],
    tintColor: theme.colors.primary,
  },
  externalLinkIcon: {
    width: 19.5,
    height: 19.5,
    marginEnd: theme.spacing[1],
    tintColor: theme.colors.dim,
    opacity: 0.45,
    transform: rt.rtl ? undefined : [{ rotate: "90deg" }],
  },
  switch: {
    marginEnd: isLiquidGlassSupported ? theme.spacing[4] : 0,
  },
}))
