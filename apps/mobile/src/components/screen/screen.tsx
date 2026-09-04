import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { ScreenProps } from "./screen.props"
import { isNonScrolling, offsets } from "./screen.presets"

const isIos = Platform.OS === "ios"

function ScreenWithoutScrolling(props: ScreenProps) {
  const isDarkMode = useColorScheme() === "dark"
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}

  return (
    <KeyboardAvoidingView
      style={[styles.fixedOuter, backgroundStyle]}
      behavior={isIos ? "padding" : null}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar
        barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"}
        translucent={props.translucent || false}
        backgroundColor={props.statusBarBackgroundColor || (isDarkMode ? "#1c1c1e" : "#f2f2f7")}
        animated={true}
      />
      <View style={[styles.fixedInner, style, styles.insetTop(!!props.unsafe)]}>{props.children}</View>
    </KeyboardAvoidingView>
  )
}

function ScreenWithScrolling(props: ScreenProps) {
  const isDarkMode = useColorScheme() === "dark"
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}

  return (
    <KeyboardAvoidingView
      style={[styles.scrollOuter, backgroundStyle]}
      behavior={isIos ? "padding" : null}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar
        barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"}
        translucent={props.translucent || false}
        backgroundColor={props.statusBarBackgroundColor || (isDarkMode ? "#1c1c1e" : "#f2f2f7")}
        animated={true}
      />
      <View style={[styles.scrollOuter, backgroundStyle, styles.insetTop(!!props.unsafe)]}>
        <ScrollView style={[styles.scrollOuter, backgroundStyle]} contentContainerStyle={[styles.scrollInner, style]}>
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

const styles = StyleSheet.create((theme, rt) => ({
  // No scrolling. Suitable for full-screen carousels and components with built-in scrolling.
  fixedOuter: {
    backgroundColor: theme.colors.background,
    flex: 1,
    height: "100%",
  },
  fixedInner: {
    justifyContent: "flex-start",
    alignItems: "stretch",
    height: "100%",
    width: "100%",
  },
  // Scrolls. Suitable for forms or other things requiring a keyboard.
  scrollOuter: {
    backgroundColor: theme.colors.background,
    flex: 1,
    height: "100%",
  },
  scrollInner: {
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  insetTop: (unsafe: boolean) => ({
    paddingTop: unsafe ? 0 : rt.insets.top,
  }),
}))
