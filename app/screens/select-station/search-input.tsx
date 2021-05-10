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
import { color, spacing, typography } from "../../theme"

const SEARCH_BAR: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingStart: spacing[3],
  paddingVertical: Platform.select({ ios: spacing[3], android: undefined }),
  paddingEnd: spacing[2],
  borderRadius: 8,
  backgroundColor: color.background,
}

const SEARCH_INPUT_WRAPPER: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
}

const SEARCH_ICON: ImageStyle = {
  width: 18,
  height: 18,
  marginEnd: spacing[1] + 2,
  tintColor: color.dim,
}

const TEXT_INPUT: TextStyle = {
  textAlign: I18nManager.isRTL ? "right" : "left",
  fontFamily: typography.primary,
  color: color.text,
}

const DISMISS_ICON: ImageStyle = {
  width: 20,
  height: 20,
  tintColor: color.dim,
  opacity: 0.65,
}

export const SearchInput = ({ searchTerm, setSearchTerm }) => (
  <View style={SEARCH_BAR}>
    <View style={SEARCH_INPUT_WRAPPER}>
      <Image style={SEARCH_ICON} source={require("../../../assets/search.png")} />
      <TextInput
        style={TEXT_INPUT}
        placeholder={translate("selectStation.placeholder")}
        placeholderTextColor={color.dim}
        value={searchTerm}
        onChangeText={(text) => {
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
        }}
        autoFocus={true}
        autoCorrect={false}
      />
    </View>

    {searchTerm.length > 0 && (
      <Pressable onPress={() => setSearchTerm("")}>
        <Image style={DISMISS_ICON} source={require("../../../assets/dismiss.png")} />
      </Pressable>
    )}
  </View>
)
