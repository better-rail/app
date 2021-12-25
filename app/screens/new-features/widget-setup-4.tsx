import React from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { Screen, Text, Button } from "../../components"
import { translate } from "../../i18n"
import { NewFeatureStackProps } from "../../navigators/new-features/new-features-navigator"
import { color, spacing } from "../../theme"

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
  marginBottom: spacing[2],
}

const IMAGE_CONTAINER: ViewStyle = {
  alignItems: "center",
  overflow: "hidden",
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

export const WidgetStep4 = function WidgetStep4({ navigation }: NewFeatureStackProps) {
  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <LinearGradient style={GARDIENT} colors={["#0575E6", "#021B79"]} />
      <View style={{ paddingHorizontal: spacing[7], marginTop: spacing[6] + 4 }}>
        <Text preset="header" style={TITLE}>
          הגדרת ווידג׳ט
        </Text>
        <Text style={TEXT}>1. לחצו לחיצה ארוכה על הווידג'ט כדי לפתוח את תפריט הפעולות.</Text>
        <Text style={TEXT}>2. הקישו על ״עריכת וידג׳ט".</Text>
      </View>
      <View style={IMAGE_CONTAINER}>
        <Image source={require("../../../assets/widget-config-hebrew.png")} style={IMAGE_STYLE} />
      </View>
      <View style={{ paddingHorizontal: spacing[7], marginBottom: spacing[3] }}>
        <Text style={TEXT}>3. בחרו את תחנת המוצא והיעד עבור הוידג׳ט.</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <Button title={"המשך"} onPress={() => navigation.navigate("step3")} containerStyle={{ width: deviceWidth - 40 }} />
      </View>
    </Screen>
  )
}
