import React from "react"
import { View, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, Button } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"

export const WidgetStep1 = function WidgetStep1() {
  const router = useRouter()
  const wrapperStyle = useWidgetWrapperStyle()

  const addWidgetImage = (() => {
    if (userLocale === "he") {
      return require("../../../assets/add-widget-hebrew.png")
    } else {
      return require("../../../assets/add-widget-english.png")
    }
  })()

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />

      <View style={wrapperStyle}>
        <Text preset="header" style={styles.title} tx="widgetOnboarding.howToAdd" maxFontSizeMultiplier={1.2} />
        <Text style={styles.text} tx="widgetOnboarding.addStep1" />
        <Text style={styles.text} tx="widgetOnboarding.addStep2" />
      </View>
      <View style={styles.imageContainer}>
        <Image source={addWidgetImage} style={styles.image} />
      </View>
      <View style={styles.step3Container}>
        <Text style={styles.text} tx="widgetOnboarding.addStep3" />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title={translate("common.next")}
          onPress={() => router.push("/widget-onboarding/step-2")}
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
    marginBottom: theme.spacing[3],
  },
  imageContainer: {
    alignItems: "center",
    overflow: "hidden",
    marginVertical: theme.spacing[4],
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 5,
    shadowOpacity: 0.5,
  },
  image: {
    width: 290,
    borderColor: "rgba(0, 0, 0, 0.3)",
    height: 210,
    resizeMode: "contain",
    marginHorizontal: -24,
    borderRadius: 12,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  step3Container: {
    paddingHorizontal: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: rt.fontScale < 1.2 ? theme.spacing[5] : 0,
    marginBottom: rt.insets.bottom + 4,
  },
  button: {
    width: rt.screen.width - 40,
  },
}))
