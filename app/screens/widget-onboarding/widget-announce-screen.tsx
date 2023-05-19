import React from "react"
import { View, TextStyle, Image, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen, Text, Button } from "../../components"
import { translate, userLocale } from "../../i18n"
import { WidgetOnboardingStackProps } from "../../navigators/widget-onboarding/widget-onboarding-navigator"
import { color, fontScale, spacing } from "../../theme"
import { WidgetOnboardingBackground } from "./widget-onboarding-background"

const { width: deviceWidth } = Dimensions.get("screen")

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: -4,
  fontWeight: "300",
  opacity: 0.8,
}

const TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[4],
  fontSize: 32,
  textAlign: "center",
}

const TEXT: TextStyle = {
  color: color.whiteText,
  textAlign: "center",
  paddingHorizontal: spacing[4],
}

export const WidgetAnnouncement = function WidgetAnnouncement({ navigation }: WidgetOnboardingStackProps) {
  const insets = useSafeAreaInsets()

  let widgetImage

  if (userLocale === "he") {
    widgetImage = require("../../../assets/widget-hebrew-2.png")
  } else {
    widgetImage = require("../../../assets/widget-english-2.png")
  }
  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <WidgetOnboardingBackground />
      <View style={{ alignItems: "center", paddingHorizontal: spacing[5], marginTop: spacing[6] + 4 }}>
        <Text preset="header" style={TITLE} tx="widgetOnboarding.homeWidgets" maxFontSizeMultiplier={1.11} />
        <Text style={TEXT} tx="widgetOnboarding.widgetDescription" />
        <Image
          source={widgetImage}
          style={{ width: deviceWidth - 40, height: 360, resizeMode: "contain", marginVertical: spacing[4] }}
        />
        {fontScale < 1.2 && <Text style={[TEXT, { marginBottom: spacing[4] + 2 }]} tx="widgetOnboarding.widgetGuide" />}

        <Button
          title={translate("common.next")}
          onPress={() => navigation.navigate("step1")}
          containerStyle={{ width: deviceWidth - 40, marginBottom: insets.bottom + 4 }}
        />
      </View>
    </Screen>
  )
}
