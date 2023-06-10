import React from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import InAppReview from "react-native-in-app-review"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen, Text, Button } from "../../components"
import { translate } from "../../i18n"
import * as storage from "../../utils/storage"
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
  marginBottom: spacing[3],
}

const IMAGE_CONTAINER: ViewStyle = {
  alignItems: "center",
  overflow: "hidden",
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 5,
  shadowOpacity: 0.5,
  marginBottom: spacing[1],
}

const IMAGE_STYLE: ImageStyle = {
  width: 300,
  borderWidth: 1,
  borderColor: "rgba(0, 0, 0, 1)",
  height: 150,
  resizeMode: "contain",
  marginHorizontal: -24,
  borderRadius: 12,
  marginTop: spacing[2],
  marginBottom: spacing[4],
}

export const WidgetStep3 = function WidgetStep3({ navigation }: WidgetOnboardingStackProps) {
  const insets = useSafeAreaInsets()
  const wrapperStyle = useWidgetWrapperStyle()

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />
      <View style={wrapperStyle}>
        <Text preset="header" style={TITLE} tx="widgetOnboarding.stacking" />

        <Text style={[TEXT, { textAlign: "center", marginBottom: spacing[5] }]} tx="widgetOnboarding.stackingIntro"></Text>
        <Text style={TEXT} tx="widgetOnboarding.stackingStep1" />
        <Text style={TEXT} tx="widgetOnboarding.stackingStep2" />
      </View>
      <View style={IMAGE_CONTAINER}>
        <Image source={require("../../../assets/widget-stack-hebrew.gif")} style={IMAGE_STYLE} />
      </View>
      <View style={{ paddingHorizontal: spacing[6], marginBottom: spacing[3] }}>
        <Text style={TEXT} tx="widgetOnboarding.stackingStep3" />
        <Text style={TEXT} tx="widgetOnboarding.stackingStep4" />
      </View>

      <View style={{ alignItems: "center", marginTop: fontScale < 1.2 ? spacing[4] + 12 : 0, marginBottom: insets.bottom + 4 }}>
        <Button
          title={translate("common.done")}
          onPress={() => {
            navigation.navigate("settingsStack")

            storage.load("lastInAppReview").then((value) => {
              if (!value) {
                InAppReview.RequestInAppReview().then(() => {
                  storage.save("lastInAppReview", new Date().toISOString())
                })
              }
            })
          }}
          containerStyle={{ width: deviceWidth - 40 }}
        />
      </View>
    </Screen>
  )
}
