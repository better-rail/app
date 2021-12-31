import React from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen, Text, Button } from "../../components"
import { translate } from "../../i18n"
import { NewFeatureStackProps } from "../../navigators/new-features/new-features-navigator"
import { color, fontScale, spacing } from "../../theme"
import { NewFeatureBackground } from "./new-features-background"

const { width: deviceWidth } = Dimensions.get("screen")

const GARDIENT: ViewStyle = {
  height: "200%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  opacity: 1,
}

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

export const WidgetStep3 = function WidgetStep3({ navigation }: NewFeatureStackProps) {
  const insets = useSafeAreaInsets()

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <NewFeatureBackground />
      <View style={{ paddingHorizontal: spacing[6], marginTop: spacing[6] + 4 }}>
        <Text preset="header" style={TITLE} tx="newFeature.stacking" />

        <Text style={[TEXT, { textAlign: "center", marginBottom: spacing[5] }]} tx="newFeature.stackingIntro"></Text>
        <Text style={TEXT} tx="newFeature.stackingStep1" />
        <Text style={TEXT} tx="newFeature.stackingStep2" />
      </View>
      <View style={IMAGE_CONTAINER}>
        <Image source={require("../../../assets/widget-stack-hebrew.gif")} style={IMAGE_STYLE} />
      </View>
      <View style={{ paddingHorizontal: spacing[6], marginBottom: spacing[3] }}>
        <Text style={TEXT} tx="newFeature.stackingStep3" />
        <Text style={TEXT} tx="newFeature.stackingStep4" />
      </View>

      <View style={{ alignItems: "center", marginTop: fontScale < 1.2 ? spacing[4] + 12 : 0, marginBottom: insets.bottom + 4 }}>
        <Button
          title={translate("common.next")}
          onPress={() => navigation.navigate("step4")}
          containerStyle={{ width: deviceWidth - 40 }}
        />
      </View>
    </Screen>
  )
}
