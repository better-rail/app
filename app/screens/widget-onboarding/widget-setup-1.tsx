import React, { useMemo } from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen, Text, Button } from "../../components"
import { translate, userLocale } from "../../i18n"
import { WidgetOnboardingStackProps } from "../../navigators/widget-onboarding/widget-onboarding-navigator"
import { color, fontScale, spacing } from "../../theme"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"
import { useWidgetWrapperStyle } from "./widget-styles"

const { width: deviceWidth, height: deviceHeight } = Dimensions.get("screen")

const TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[3],
  fontSize: 32,
  textAlign: "center",
}

const TEXT: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[3],
}

const IMAGE_CONTAINER: ViewStyle = {
  alignItems: "center",
  overflow: "hidden",
  marginVertical: spacing[4],
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 5,
  shadowOpacity: 0.5,
}

const IMAGE_STYLE: ImageStyle = {
  width: 290,
  borderColor: "rgba(0, 0, 0, 0.3)",
  height: 210,
  resizeMode: "contain",
  marginHorizontal: -24,
  borderRadius: 12,
  marginTop: spacing[2],
  marginBottom: spacing[4],
}

export const WidgetStep1 = function WidgetStep1({ navigation }: WidgetOnboardingStackProps) {
  const insets = useSafeAreaInsets()
  const wrapperStyle = useWidgetWrapperStyle()

  const addWidgetImage = useMemo(() => {
    if (userLocale === "he") {
      return require("../../../assets/add-widget-hebrew.png")
    } else {
      return require("../../../assets/add-widget-english.png")
    }
  }, [])

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />

      <View style={wrapperStyle}>
        <Text preset="header" style={TITLE} tx="widgetOnboarding.howToAdd" maxFontSizeMultiplier={1.2} />
        <Text style={TEXT} tx="widgetOnboarding.addStep1" />
        <Text style={TEXT} tx="widgetOnboarding.addStep2" />
      </View>
      <View style={IMAGE_CONTAINER}>
        <Image source={addWidgetImage} style={IMAGE_STYLE} />
      </View>
      <View style={{ paddingHorizontal: spacing[6], marginBottom: spacing[4] }}>
        <Text style={TEXT} tx="widgetOnboarding.addStep3" />
      </View>
      <View
        style={{
          alignItems: "center",
          marginTop: fontScale < 1.2 ? spacing[5] : 0,
          marginBottom: insets.bottom + 4,
        }}
      >
        <Button
          title={translate("common.next")}
          onPress={() => navigation.navigate("step2")}
          containerStyle={{ width: deviceWidth - 40 }}
        />
      </View>
    </Screen>
  )
}
