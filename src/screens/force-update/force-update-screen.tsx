import React from "react"
import { Linking, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { Button } from "@/components/button/button"
import { translate } from "@/i18n"
import { trackEvent } from "@/services/analytics"

const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976",
  android: "market://details?id=com.betterrail",
})!

export function ForceUpdateScreen() {
  const onPress = () => {
    trackEvent("force_update_store_press")
    Linking.openURL(STORE_URL)
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚂</Text>
        <Text style={styles.title}>{translate("forceUpdate.title")}</Text>
        <Text style={styles.description}>{translate("forceUpdate.description")}</Text>
        <Button
          title={translate("forceUpdate.button")}
          onPress={onPress}
          containerStyle={styles.button}
          style={styles.buttonLiquidGlass}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing[4],
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: theme.colors.text,
    lineHeight: 24,
  },
  button: {
    minWidth: "100%",
  },
  buttonLiquidGlass: {
    minWidth: "100%",
  },
}))
