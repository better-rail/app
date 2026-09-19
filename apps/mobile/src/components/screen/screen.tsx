import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { ScreenProps } from "./screen.props"
import { isNonScrolling, offsets } from "./screen.presets"
import { SafeAreaView } from "react-native-safe-area-context"

const isIos = Platform.OS === "ios"

/**
 * The side safe-area edges to pad. Side insets aren't symmetric on iPhone Duo (its bars sit on one edge), and
 * SafeAreaView measures them against this view's own frame, so a sheet that doesn't reach that edge isn't inset.
 */
const sideEdges = (props: ScreenProps) => (props.edgeToEdge ? [] : (["left", "right"] as const))

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
      <SafeAreaView
        testID={props.testID}
        edges={sideEdges(props)}
        style={[styles.fixedInner, style, styles.insetTop(!!props.unsafe)]}
      >
        {props.children}
      </SafeAreaView>
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
      <View testID={props.testID} style={[styles.scrollOuter, backgroundStyle, styles.insetTop(!!props.unsafe)]}>
        {/* The scroll view spans the full width, so absolutely positioned backgrounds reach the screen edges; the
            side insets pad its content instead. */}
        <ScrollView style={[styles.scrollOuter, backgroundStyle]} contentContainerStyle={[styles.scrollInner, style]}>
          <SafeAreaView edges={sideEdges(props)}>{props.children}</SafeAreaView>
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
