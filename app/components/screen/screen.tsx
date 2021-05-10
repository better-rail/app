import * as React from "react"
import { Appearance, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScreenProps } from "./screen.props"
import { isNonScrolling, offsets, presets } from "./screen.presets"

const isIos = Platform.OS === "ios"
const isDarkMode = Appearance.getColorScheme() === "dark"

function ScreenWithoutScrolling(props: ScreenProps) {
  const insets = useSafeAreaInsets()
  const preset = presets.fixed
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}
  const insetStyle = { paddingTop: props.unsafe ? 0 : insets.top }

  return (
    <KeyboardAvoidingView
      style={[preset.outer, backgroundStyle]}
      behavior={isIos ? "padding" : null}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar
        barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"}
        translucent={props.translucent || false}
        backgroundColor={props.statusBarBackgroundColor || (isDarkMode ? "#1c1c1e" : "#f2f2f7")}
        animated={true}
      />
      <View style={[preset.inner, style, insetStyle]}>{props.children}</View>
    </KeyboardAvoidingView>
  )
}

function ScreenWithScrolling(props: ScreenProps) {
  const insets = useSafeAreaInsets()
  const preset = presets.scroll
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}
  const insetStyle = { paddingTop: props.unsafe ? 0 : insets.top }

  return (
    <KeyboardAvoidingView
      style={[preset.outer, backgroundStyle]}
      behavior={isIos ? "padding" : null}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar
        barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"}
        translucent={props.translucent || false}
        backgroundColor={props.statusBarBackgroundColor || (isDarkMode ? "#1c1c1e" : "#f2f2f7")}
        animated={true}
      />
      <View style={[preset.outer, backgroundStyle, insetStyle]}>
        <ScrollView style={[preset.outer, backgroundStyle]} contentContainerStyle={[preset.inner, style]}>
          {props.children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

/**
 * The starting component on every screen in the app.
 *
 * @param props The screen props
 */
export function Screen(props: ScreenProps) {
  if (isNonScrolling(props.preset)) {
    return <ScreenWithoutScrolling {...props} />
  } else {
    return <ScreenWithScrolling {...props} />
  }
}
