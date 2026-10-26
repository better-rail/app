import React from "react"
import { ScrollView, StatusBar, View, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { useHeaderHeight } from "expo-router/react-navigation"
import { statsPalette } from "./statistics-palette"

/** Scroll screen on the statistics gradient. The gradient sits behind the scroll view, so overscroll shows it too. */
export function StatsScreen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const headerHeight = useHeaderHeight()
  const paddingTop = headerHeight + styles.content.paddingHorizontal

  return (
    <StatsBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop }, style]}
        contentInsetAdjustmentBehavior="never"
      >
        {children}
      </ScrollView>
    </StatsBackground>
  )
}

/** The statistics gradient and light status bar, for screens that bring their own scroll view */
export function StatsBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={[statsPalette.gradientTop, statsPalette.background, statsPalette.gradientBottom]}
        locations={[0, 0.45, 1]}
      />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" animated />
      {children}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: statsPalette.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
}))
