import React from "react"
import { View, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, Button } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { fontScale } from "@/theme"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"

export const WidgetAnnouncement = function WidgetAnnouncement() {
  const router = useRouter()
  const wrapperStyle = useWidgetWrapperStyle()

  let widgetImage

  if (userLocale === "he") {
    widgetImage = require("../../../assets/widget-hebrew-2.png")
  } else {
    widgetImage = require("../../../assets/widget-english-2.png")
  }

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />
      <View style={wrapperStyle}>
        <Text preset="header" style={styles.title} tx="widgetOnboarding.homeWidgets" maxFontSizeMultiplier={1.11} />
        <Text style={styles.text} tx="widgetOnboarding.widgetDescription" />
        <Image source={widgetImage} style={styles.image} />
        {fontScale < 1.2 && <Text style={[styles.text, styles.guideText]} tx="widgetOnboarding.widgetGuide" />}

        <Button
          title={translate("common.next")}
          onPress={() => router.push("/widget-onboarding/step-1")}
          containerStyle={styles.button}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  title: {
    color: theme.colors.whiteText,
    marginBottom: theme.spacing[4],
    fontSize: 32,
    textAlign: "center",
  },
  text: {
    color: theme.colors.whiteText,
    textAlign: "center",
    paddingHorizontal: theme.spacing[4],
  },
  guideText: {
    marginBottom: theme.spacing[4] + 2,
  },
  image: {
    width: rt.screen.width - 40,
    height: 360,
    resizeMode: "contain",
    marginVertical: theme.spacing[4],
  },
  button: {
    width: rt.screen.width - 40,
    marginBottom: rt.insets.bottom + 4,
  },
}))
