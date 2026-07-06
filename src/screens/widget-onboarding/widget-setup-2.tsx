import React from "react"
import { View, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, Button } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"

export const WidgetStep2 = function WidgetStep2() {
  const router = useRouter()
  const wrapperStyle = useWidgetWrapperStyle()

  let configImage

  if (userLocale === "he") {
    configImage = require("../../../assets/widget-config-hebrew.png")
  } else {
    configImage = require("../../../assets/widget-config-english.png")
  }

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />
      <View style={wrapperStyle}>
        <Text preset="header" style={styles.title} tx="widgetOnboarding.configuring" maxFontSizeMultiplier={1.2} />
        <Text style={styles.text} tx="widgetOnboarding.configStep1" />
        <Text style={styles.text} tx="widgetOnboarding.configStep2" />
      </View>
      <View style={styles.imageContainer}>
        <Image source={configImage} style={styles.image} />
      </View>
      <View style={styles.step3Container}>
        <Text style={styles.text} tx="widgetOnboarding.configStep3" />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title={translate("common.next")}
          onPress={() => router.push("/widget-onboarding/step-3")}
          containerStyle={styles.button}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  title: {
    color: theme.colors.whiteText,
    marginBottom: theme.spacing[3],
    fontSize: 32,
    textAlign: "center",
  },
  text: {
    color: theme.colors.whiteText,
    marginBottom: theme.spacing[2],
  },
  imageContainer: {
    alignItems: "center",
    overflow: "hidden",
    marginVertical: theme.spacing[3],
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 5,
    shadowOpacity: 0.5,
  },
  image: {
    width: 280,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    height: 295,
    resizeMode: "contain",
    marginHorizontal: -24,
    borderRadius: 12,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  step3Container: {
    paddingHorizontal: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: rt.fontScale < 1.2 ? theme.spacing[4] : 0,
    marginBottom: rt.insets.bottom + 4,
  },
  button: {
    width: rt.screen.width - 40,
  },
}))
