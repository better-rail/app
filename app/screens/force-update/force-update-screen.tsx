import React from "react"
import { Linking, Platform, View, ViewStyle, TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "../../components"
import { Button } from "../../components/button/button"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { trackEvent } from "../../services/analytics"

const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976",
  android: "market://details?id=com.betterrail",
})!

const CONTAINER: ViewStyle = {
  flex: 1,
  backgroundColor: color.background,
  paddingHorizontal: spacing[4],
}

const CONTENT: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
}

const EMOJI: TextStyle = {
  fontSize: 64,
  marginBottom: spacing[2],
}

const TITLE: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  textAlign: "center",
}

const DESCRIPTION: TextStyle = {
  fontSize: 16,
  textAlign: "center",
  color: color.text,
  lineHeight: 24,
}

const BUTTON: ViewStyle = {
  minWidth: "100%",
}

const BUTTON_LIQUID_GLASS: ViewStyle = {
  minWidth: "100%",
}

export function ForceUpdateScreen() {
  const insets = useSafeAreaInsets()

  const onPress = () => {
    trackEvent("force_update_store_press", { platform: Platform.OS })
    Linking.openURL(STORE_URL)
  }

  return (
    <View style={[CONTAINER, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={CONTENT}>
        <Text style={EMOJI}>🚂</Text>
        <Text style={TITLE}>{translate("forceUpdate.title")}</Text>
        <Text style={DESCRIPTION}>{translate("forceUpdate.description")}</Text>
        <Button title={translate("forceUpdate.button")} onPress={onPress} containerStyle={BUTTON} style={BUTTON_LIQUID_GLASS} />
      </View>
    </View>
  )
}
