import { useContext, type ReactNode } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, useColorScheme } from "react-native"
import { HeaderHeightContext } from "expo-router/react-navigation"
import { StyleSheet } from "react-native-unistyles"
import { ScreenProps } from "./screen.props"
import { isNonScrolling, offsets } from "./screen.presets"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"

const isIos = Platform.OS === "ios"

/**
 * The side safe-area edges to pad. Side insets aren't symmetric on iPhone Duo (its bars sit on one edge), and
 * they're measured against the screen's own frame (see `ScreenInsets`), so a sheet that doesn't reach that edge
 * isn't inset.
 */
const sideEdges = (props: ScreenProps) => (props.edgeToEdge ? [] : (["left", "right"] as const))

/**
 * Measures the safe area against this screen's own view, for the SafeAreaViews and `useSafeAreaInsets` below it.
 * Without a provider of its own a SafeAreaView reads its insets once, as it enters the window; in a sheet that's
 * before the presentation has laid it out, so on iPhone Duo its content ends up under the side bar.
 */
function ScreenInsets({ children }: { children: ReactNode }) {
  return <SafeAreaProvider style={styles.provider}>{children}</SafeAreaProvider>
}

/** The height of the native stack header above the screen, when it asks to start below it (0 outside a stack). */
function useHeaderInset(props: ScreenProps) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0
  return props.belowHeader ? headerHeight : 0
}

function ScreenWithoutScrolling(props: ScreenProps) {
  const isDarkMode = useColorScheme() === "dark"
  const headerInset = useHeaderInset(props)
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}

  return (
    <KeyboardAvoidingView
      style={[styles.fixedOuter, backgroundStyle]}
      behavior={isIos ? "padding" : undefined}
      enabled={props.keyboardAvoiding ?? true}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"} animated={true} />
      <SafeAreaView
        testID={props.testID}
        edges={sideEdges(props)}
        style={[styles.fixedInner, style, styles.insetTop(!!props.unsafe, headerInset)]}
      >
        {props.children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

function ScreenWithScrolling(props: ScreenProps) {
  const isDarkMode = useColorScheme() === "dark"
  const headerInset = useHeaderInset(props)
  const style = props.style || {}
  const backgroundStyle = props.backgroundColor ? { backgroundColor: props.backgroundColor } : {}

  return (
    <KeyboardAvoidingView
      style={[styles.scrollOuter, backgroundStyle]}
      behavior={isIos ? "padding" : undefined}
      enabled={props.keyboardAvoiding ?? true}
      keyboardVerticalOffset={offsets[props.keyboardOffset || "none"]}
    >
      <StatusBar barStyle={props.statusBar || isDarkMode ? "light-content" : "dark-content"} animated={true} />
      <View testID={props.testID} style={[styles.scrollOuter, backgroundStyle, styles.insetTop(!!props.unsafe, headerInset)]}>
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
  return (
    <ScreenInsets>
      {isNonScrolling(props.preset) ? <ScreenWithoutScrolling {...props} /> : <ScreenWithScrolling {...props} />}
    </ScreenInsets>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  provider: {
    flex: 1,
  },
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
  // A header inset already includes the top safe-area inset.
  insetTop: (unsafe: boolean, headerInset: number) => ({
    paddingTop: headerInset > 0 ? headerInset : unsafe ? 0 : rt.insets.top,
  }),
}))
