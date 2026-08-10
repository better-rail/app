import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native"
import { ScrollViewMarker } from "react-native-screens/experimental"

const scrollEdgeEffects = { top: "hidden" } as const

export function LiveAnnouncementScrollView({ style, ...props }: ScrollViewProps) {
  return (
    <ScrollViewMarker style={styles.container} scrollEdgeEffects={scrollEdgeEffects}>
      <ScrollView {...props} style={[styles.container, style]} />
    </ScrollViewMarker>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
