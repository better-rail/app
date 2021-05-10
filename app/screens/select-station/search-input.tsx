import React from "react"
import { TextInput, LayoutAnimation, I18nManager } from "react-native"
import { translate } from "../../i18n"
import { color, spacing, typography } from "../../theme"

const SEARCH_BAR: TextStyle = {
  flex: 1,
  padding: spacing[3],

  textAlign: I18nManager.isRTL ? "right" : "left",
  fontFamily: typography.primary,
  borderRadius: 8,
  color: color.text,
  backgroundColor: color.background,
}

export const SearchInput = ({ setSearchTerm }) => (
  <TextInput
    style={SEARCH_BAR}
    placeholder={translate("selectStation.placeholder")}
    placeholderTextColor={color.dim}
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
)
