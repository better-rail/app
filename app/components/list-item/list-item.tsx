import * as React from "react"
import {
  View,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
  TouchableHighlightProps,
  PixelRatio,
  ImageSourcePropType,
} from "react-native"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"
import { TouchableHighlight } from "react-native-gesture-handler"

// #region styles

const fontScale = PixelRatio.getFontScale()

const chevronIcon = require("../../../assets/chevron.png")

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  // borderColor: color.seperator,
  // borderWidth: 1,
  paddingVertical: spacing[3] * fontScale,
  paddingHorizontal: spacing[4],
}

const CONTENT_CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const THUMB_IMAGE: ImageStyle = {
  width: 55 * fontScale,
  height: 55 * fontScale,
  marginEnd: spacing[3] * fontScale,
  borderWidth: 1,
  borderColor: color.seperator,
  borderRadius: 2,
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
  opacity: 0.85,
}

const CHEVRON_ICON: ImageStyle = {
  width: 8 * fontScale,
  height: 16 * fontScale,
  marginEnd: spacing[2] * fontScale,
  tintColor: color.dim,
  opacity: 0.6,
}

// #endregion

export interface ListItemProps extends TouchableHighlightProps {
  image: ImageSourcePropType
}

/**
 * Describe your component here
 */
export const ListItem = function ListItem(props: ListItemProps) {
  const { image, onPress, style } = props
  const title = "ירושלים - יצחק נבון"
  const subtitle = "היום בשעה 08:33"

  return (
    <TouchableHighlight onPress={onPress} style={style} underlayColor={color.inputPlaceholderBackground}>
      <View style={CONTAINER}>
        <View style={CONTENT_CONTAINER}>
          {image && <Image style={THUMB_IMAGE} source={image} />}

          <View style={TEXT_CONTENT_WRAPPER}>
            <Text style={TITLE}>{title}</Text>
            {subtitle && <Text style={SUBTITLE}>{subtitle}</Text>}
          </View>
        </View>
        <Image style={CHEVRON_ICON} source={chevronIcon} />
      </View>
    </TouchableHighlight>
  )
}
