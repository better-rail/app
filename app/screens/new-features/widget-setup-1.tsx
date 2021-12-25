import React from "react"
import { View, TextStyle, ViewStyle, Image, Dimensions } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { Screen, Text, Button } from "../../components"
import { translate } from "../../i18n"
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

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: -4,
  fontWeight: "300",
  opacity: 0.8,
}

const TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[3],
  fontSize: 32,
}

const TEXT: TextStyle = {
  color: color.whiteText,
}

function WidgetStep1() {
  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <LinearGradient style={GARDIENT} colors={["#0575E6", "#021B79"]} />
      <View style={{ paddingHorizontal: spacing[7], marginTop: spacing[6] + 4 }}>
        <Text preset="header" style={TITLE}>
          איך להוסיף ווידג׳ט
        </Text>
        <Text style={TEXT}>1. From the Home Screen, touch and hold a widget or an empty area until the apps jiggle.</Text>
        <Image
          source={require("../../../assets/widget-hebrew.png")}
          style={{ width: deviceWidth - 40, height: 240, resizeMode: "contain" }}
        />
        <Text style={[TEXT, { marginBottom: spacing[6] }]}>הכנו מדריך קצר עם טיפים לשימוש בווידג׳טים החדשים </Text>
        <Button title={"המשך"} onPress={() => undefined} containerStyle={{ width: deviceWidth - 40 }} />
      </View>
    </Screen>
  )
}

export default WidgetStep1
