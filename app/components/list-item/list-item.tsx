import * as React from "react"
import { View, Image, ViewStyle, TextStyle, ImageStyle, TouchableHighlightProps } from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"
import { TouchableHighlight } from "react-native-gesture-handler"

const chevronIcon = require("../../../assets/chevron.png")

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  // borderColor: color.seperator,
  // borderWidth: 1,
  padding: spacing[4],
}

const TEXT_CONTENT_WRAPPER: ViewStyle = {}

const TITLE: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 16,
  fontWeight: "700",
  color: color.text,
}

const SUBTITLE: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 14,
  color: color.text,
}

const CHEVRON_ICON: ImageStyle = {
  width: 8,
  height: 16,
  marginEnd: spacing[2],
  tintColor: color.dim,
  opacity: 0.6,
}

export interface ListItemProps extends TouchableHighlightProps {}

/**
 * Describe your component here
 */
export const ListItem = function ListItem(props: ListItemProps) {
  const { onPress, style } = props
  const title = "ירושלים - יצחק נבון"
  const subtitle = "היום בשעה 08:33"

  return (
    <TouchableHighlight onPress={onPress} style={style} underlayColor={color.inputPlaceholderBackground}>
      <View style={CONTAINER}>
        <View style={TEXT_CONTENT_WRAPPER}>
          <Text style={TITLE}>{title}</Text>
          {subtitle && <Text style={SUBTITLE}>{subtitle}</Text>}
        </View>
        <Image style={CHEVRON_ICON} source={chevronIcon} />
      </View>
    </TouchableHighlight>
  )
}
