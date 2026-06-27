import React from "react"
import { View, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, Button } from "@/components"
import { translate } from "@/i18n"
import * as storage from "@/utils/storage"
import { useRouter } from "expo-router"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"
import { trackEvent } from "@/services/analytics"
import { requestStoreReview } from "@/utils/helpers/store-review-helpers"

export const WidgetStep3 = function WidgetStep3() {
  const router = useRouter()
  const wrapperStyle = useWidgetWrapperStyle()

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />
      <View style={wrapperStyle}>
        <Text preset="header" style={styles.title} tx="widgetOnboarding.stacking" />

        <Text style={[styles.text, styles.introText]} tx="widgetOnboarding.stackingIntro" />
        <Text style={styles.text} tx="widgetOnboarding.stackingStep1" />
        <Text style={styles.text} tx="widgetOnboarding.stackingStep2" />
      </View>
      <View style={styles.imageContainer}>
        <Image source={require("../../../assets/widget-stack-hebrew.gif")} style={styles.image} />
      </View>
      <View style={styles.step3Container}>
        <Text style={styles.text} tx="widgetOnboarding.stackingStep3" />
        <Text style={styles.text} tx="widgetOnboarding.stackingStep4" />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={translate("common.done")}
          onPress={() => {
            trackEvent("finished_widget_onboarding")
            router.dismiss()

            storage.load("lastInAppReview").then((value) => {
              if (!value) {
                requestStoreReview().then(() => {
                  storage.save("lastInAppReview", new Date().toISOString())
                })
              }
            })
          }}
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
  introText: {
    textAlign: "center",
    marginBottom: theme.spacing[5],
  },
  imageContainer: {
    alignItems: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 5,
    shadowOpacity: 0.5,
    marginBottom: theme.spacing[1],
  },
  image: {
    width: 300,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 1)",
    height: 150,
    resizeMode: "contain",
    marginHorizontal: -24,
    borderRadius: 12,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  step3Container: {
    paddingHorizontal: theme.spacing[6],
    marginBottom: theme.spacing[3],
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: rt.fontScale < 1.2 ? theme.spacing[4] + 12 : 0,
    marginBottom: rt.insets.bottom + 4,
  },
  button: {
    width: rt.screen.width - 40,
  },
}))
