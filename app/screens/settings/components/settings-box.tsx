import React from "react"
import {
  Image,
  View,
  ViewStyle,
  TextStyle,
  TouchableHighlight,
  TouchableHighlightProps,
  ImageStyle,
  Platform,
} from "react-native"
import { Text } from "../../../components"
import { isRTL } from "../../../i18n"
import { color, spacing } from "../../../theme"

const chevronIcon = require("../../../../assets/chevron.png")
const checkmarkIcon = require("../../../../assets/checkmark.png")
const externalLinkIcon = require("../../../../assets/external-link.png")

const SETTINGS_BOX_BASE: ViewStyle = {
  flexDirection: "row",
  paddingVertical: 16,
  paddingHorizontal: 12,
}

const SETTINGS_BOX_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  flex: 1,
}

const SETTINGS_BOX_DETAILS: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const SETTINGS_BOX_TITLE: TextStyle = { marginStart: spacing[2], fontSize: 16.5, fontWeight: "400" }

const CHECKMARK_ICON: ImageStyle = {
  width: 19.5,
  height: 19.5,
  marginEnd: spacing[1],
  tintColor: color.primary,
}

const EXTERNAL_LINK_ICON: ImageStyle = {
  width: 19.5,
  height: 19.5,
  marginEnd: spacing[1],
  tintColor: color.dim,
  opacity: 0.6,
}

const CHEVRON_ICON: ImageStyle = {
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
}

export const SettingBox = function SettingBox(props: SettingBoxProps) {
  const { title, icon, first, last, externalLink, chevron, checkmark, onPress, style } = props
  let boxStyle: ViewStyle = {}

  if (!first) boxStyle = { borderTopColor: Platform.select({ android: "#f2f2f7", ios: color.background }), borderTopWidth: 1 }

  if (first) {
    boxStyle = { borderTopLeftRadius: 10, borderTopRightRadius: 10, ...boxStyle }
  }

  if (last) {
    boxStyle = { borderBottomLeftRadius: 10, borderBottomRightRadius: 10, ...boxStyle }
  }

  return (
    <TouchableHighlight
      underlayColor={color.inputPlaceholderBackground}
      onPress={onPress}
      style={[SETTINGS_BOX_BASE, boxStyle, style]}
    >
      <View style={SETTINGS_BOX_WRAPPER}>
        <View style={SETTINGS_BOX_DETAILS}>
          {icon && <Text style={{ fontSize: 18 }}>{icon}</Text>}
          <Text style={SETTINGS_BOX_TITLE}>{title}</Text>
        </View>

        {externalLink && <Image style={EXTERNAL_LINK_ICON} source={externalLinkIcon} />}
        {chevron && <Image style={CHEVRON_ICON} source={chevronIcon} />}
        {checkmark && <Image style={CHECKMARK_ICON} source={checkmarkIcon} />}
      </View>
    </TouchableHighlight>
  )
}
