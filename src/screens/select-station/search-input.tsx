import React from "react"
import { TextInput, LayoutAnimation, View, Image, Pressable, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { translate } from "@/i18n"
import { color } from "@/theme"

const searchIcon = require("../../../assets/search.png")
const dismissIcon = require("../../../assets/dismiss.png")

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
    <View style={styles.searchBar}>
      <View style={styles.searchInputWrapper}>
        <Image style={styles.searchIcon} source={searchIcon} />
        <TextInput
          style={styles.textInput}
          placeholder={translate("selectStation.placeholder")}
          placeholderTextColor={color.dim}
          value={searchTerm}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          autoCorrect={false}
          spellCheck={false}
        />
      </View>

      {searchTerm.length > 0 && (
        <Pressable onPress={() => setSearchTerm("")} accessibilityLabel={translate("common.dismiss")}>
          <Image style={styles.dismissIcon} source={dismissIcon} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingStart: theme.spacing[3],
    paddingVertical: Platform.select({ ios: theme.spacing[3], android: undefined }),
    paddingEnd: theme.spacing[2],
    borderRadius: 8,
    backgroundColor: theme.colors.dimmer,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    width: 18 * rt.fontScale,
    height: 18 * rt.fontScale,
    marginEnd: Platform.select({ ios: theme.spacing[1] + 2, android: theme.spacing[1] }),
    tintColor: theme.colors.dim,
  },
  textInput: {
    width: "90%",
    textAlign: rt.rtl ? "right" : "left",
    fontFamily: theme.typography.primary,
    color: theme.colors.text,
  },
  dismissIcon: {
    width: 20 * rt.fontScale,
    height: 20 * rt.fontScale,
    tintColor: theme.colors.dim,
    opacity: 0.7,
  },
}))
