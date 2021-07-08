import React from "react"
import {
  TextInput,
  LayoutAnimation,
  I18nManager,
  View,
  Image,
  ImageStyle,
  ViewStyle,
  TextStyle,
  Pressable,
  Platform,
} from "react-native"
import { translate } from "../../i18n"
import { color, spacing, typography, fontScale } from "../../theme"

const searchIcon = require("../../../assets/search.png")
const dismissIcon = require("../../../assets/dismiss.png")

const SEARCH_BAR: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingStart: spacing[3],
  paddingVertical: Platform.select({ ios: spacing[3], android: undefined }),
  paddingEnd: spacing[2],
  borderRadius: 8,
  backgroundColor: color.dimmer,
}

const SEARCH_INPUT_WRAPPER: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
}

const SEARCH_ICON: ImageStyle = {
  width: 18 * fontScale,
  height: 18 * fontScale,
  marginEnd: Platform.select({ ios: spacing[1] + 2, android: spacing[1] }),
  tintColor: color.dim,
}

const TEXT_INPUT: TextStyle = {
  textAlign: I18nManager.isRTL ? "right" : "left",
  fontFamily: typography.primary,
  color: color.text,
}

const DISMISS_ICON: ImageStyle = {
  width: 20 * fontScale,
  height: 20 * fontScale,
  tintColor: color.dim,
  opacity: 0.7,
}

export const SearchInput = ({ searchTerm, setSearchTerm, autoFocus }) => {
  const onChangeText = (text) => {
    LayoutAnimation.configureNext({
      duration: 400,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 1,
      },
      delete: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 1,
      },
    })
    setSearchTerm(text)
  }

  return (
    <View style={SEARCH_BAR}>
      <View style={SEARCH_INPUT_WRAPPER}>
        <Image style={SEARCH_ICON} source={searchIcon} />
        <TextInput
          style={TEXT_INPUT}
          placeholder={translate("selectStation.placeholder")}
          placeholderTextColor={color.dim}
          value={searchTerm}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          autoCorrect={false}
        />
      </View>

      {searchTerm.length > 0 && (
        <Pressable onPress={() => setSearchTerm("")}>
          <Image style={DISMISS_ICON} source={dismissIcon} />
        </Pressable>
      )}
    </View>
  )
}
