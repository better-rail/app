import React from "react"
import { Linking, Platform, StyleSheet, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "../../components"
import { Button } from "../../components/button/button"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"

const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976",
  android: "market://details?id=com.betterrail",
})!

export function ForceUpdateScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚂</Text>
        <Text style={styles.title}>{translate("forceUpdate.title")}</Text>
        <Text style={styles.description}>{translate("forceUpdate.description")}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button title={translate("forceUpdate.button")} onPress={() => Linking.openURL(STORE_URL)} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.background as unknown as string,
    paddingHorizontal: spacing[4],
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,
  emoji: {
    fontSize: 64,
    marginBottom: spacing[2],
  } as TextStyle,
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
  description: {
    fontSize: 16,
    textAlign: "center",
    color: color.label as unknown as string,
    lineHeight: 24,
  } as TextStyle,
  buttonContainer: {
    paddingBottom: spacing[4],
    flexDirection: "row",
  } as ViewStyle,
})
