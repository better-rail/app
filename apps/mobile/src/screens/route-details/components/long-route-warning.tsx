import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useSideInsetBleed } from "./side-inset-bleed"

export const LongRouteWarning = () => {
  const bleed = useSideInsetBleed()
  return (
    <View style={[styles.wrapper, bleed]}>
      <Text style={{ fontSize: 48 }}>🕰</Text>
      <Text style={styles.title} tx="routeDetails.routeWarning" />
      <Text style={styles.text} tx="routeDetails.routeWarningText" />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing[4],
    backgroundColor: theme.colors.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  text: {
    paddingHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[3],
    textAlign: "center",
  },
}))
