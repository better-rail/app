import React from "react"
import { View, ViewStyle, TextStyle, TouchableHighlight, TouchableHighlightProps } from "react-native"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"

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

const SETTINGS_BOX_TITLE: TextStyle = { marginStart: spacing[2], fontSize: 18, fontWeight: "400" }

export interface SettingBoxProps extends TouchableHighlightProps {
  title: string
  icon: string
  first?: boolean
  last?: boolean
  endIcon?: string | null
}

export const SettingBox = function SettingBox(props: SettingBoxProps) {
  const { title, icon, first, last, endIcon, onPress, style } = props
  let boxStyle: ViewStyle = {}

  if (!first) boxStyle = { borderTopColor: color.background, borderTopWidth: 1 }

  if (first) {
    boxStyle = { borderTopLeftRadius: 10, borderTopRightRadius: 10, ...boxStyle }
  }

  if (last) {
    boxStyle = { borderBottomLeftRadius: 10, borderBottomRightRadius: 10, ...boxStyle }
  }

  return (
    <TouchableHighlight underlayColor={color.dimmer} onPress={onPress} style={[SETTINGS_BOX_BASE, boxStyle, style]}>
      <View style={SETTINGS_BOX_WRAPPER}>
        <View style={SETTINGS_BOX_DETAILS}>
          {icon && <Text style={SETTINGS_BOX_TITLE}>{icon}</Text>}
          <Text style={SETTINGS_BOX_TITLE}>{title}</Text>
        </View>
        {endIcon && <Text style={{ fontSize: 24 }}>{endIcon}</Text>}
      </View>
    </TouchableHighlight>
  )
}
