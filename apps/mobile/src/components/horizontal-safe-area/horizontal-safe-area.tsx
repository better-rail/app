import { I18nManager, Platform, View, type ViewProps } from "react-native"
import { SafeAreaView } from "react-native-screens/experimental"
import { StyleSheet } from "react-native-unistyles"

const horizontalEdges = { left: true, right: true }

/**
 * Keeps content clear of the side insets, like the unfolded iPhone Duo's status bar strip, while backgrounds
 * extend under them. Insets are measured per view, so it only pads where the view meets them.
 */
export function HorizontalSafeArea({ style, ...props }: ViewProps) {
  if (Platform.OS !== "ios") return <View style={style} {...props} />
  return <SafeAreaView edges={horizontalEdges} style={[styles.noFlex, style]} {...props} />
}

// The sidebar sits on the leading edge; the trailing inset is the unfolded iPhone Duo's status bar
const sidebarEdge = I18nManager.isRTL ? { right: true } : { left: true }

/** A split view column: the sidebar floats over the columns after it, so keep their screens beside it. */
export function SplitColumnSafeArea({ style, ...props }: ViewProps) {
  if (Platform.OS !== "ios") return <View style={[styles.column, style]} {...props} />
  return <SafeAreaView edges={sidebarEdge} style={[styles.column, style]} {...props} />
}

const styles = StyleSheet.create((theme) => ({
  noFlex: { flex: 0 },
  column: { flex: 1, backgroundColor: theme.colors.background },
}))
