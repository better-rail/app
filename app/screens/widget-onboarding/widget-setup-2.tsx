import React from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen, Text, Button } from "../../components"
import { translate, userLocale } from "../../i18n"
import { WidgetOnboardingStackProps } from "../../navigators/widget-onboarding/widget-onboarding-navigator"
import { color, fontScale, spacing } from "../../theme"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"

const { width: deviceWidth } = Dimensions.get("screen")

const TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[3],
  fontSize: 32,
  textAlign: "center",
}

const TEXT: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[2],
}

const IMAGE_CONTAINER: ViewStyle = {
  alignItems: "center",
  overflow: "hidden",
  marginVertical: spacing[3],
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 5,
  shadowOpacity: 0.5,
}

const IMAGE_STYLE: ImageStyle = {
  width: 280,
  borderWidth: 1,
  borderColor: "rgba(0, 0, 0, 0.1)",
  height: 295,
  resizeMode: "contain",
  marginHorizontal: -24,
  borderRadius: 12,
  marginTop: spacing[2],
  marginBottom: spacing[4],
}

export const WidgetStep2 = function WidgetStep2({ navigation }: WidgetOnboardingStackProps) {
  const insets = useSafeAreaInsets()
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
        <Text preset="header" style={TITLE} tx="widgetOnboarding.configuring" maxFontSizeMultiplier={1.2} />
        <Text style={TEXT} tx="widgetOnboarding.configStep1" />
        <Text style={TEXT} tx="widgetOnboarding.configStep2" />
      </View>
      <View style={IMAGE_CONTAINER}>
        <Image source={configImage} style={IMAGE_STYLE} />
      </View>
      <View style={{ paddingHorizontal: spacing[6], marginBottom: spacing[2] }}>
        <Text style={TEXT} tx="widgetOnboarding.configStep3" />
      </View>
      <View style={{ alignItems: "center", marginTop: fontScale < 1.2 ? spacing[4] : 0, marginBottom: insets.bottom + 4 }}>
        <Button
          title={translate("common.next")}
          onPress={() => navigation.navigate("step3")}
          containerStyle={{ width: deviceWidth - 40 }}
        />
      </View>
    </Screen>
  )
}
