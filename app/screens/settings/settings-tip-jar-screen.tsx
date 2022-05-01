import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { Button, Screen, Text } from "../../components"
import { color, spacing } from "../../theme"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
}

export const TipJarScreen = observer(function TipJarScreen() {
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <Text style={{ fontSize: 68, textAlign: "center", marginBottom: spacing[2] }}>💖</Text>
      <Text style={{ fontSize: 21, textAlign: "center", marginBottom: spacing[4] }}>
        Better Rail relies on your support to fund it's development.
      </Text>
      <Text style={{ fontSize: 16.5, textAlign: "center", marginBottom: spacing[4] }}>
        If you love using Better Rail, please consider supporting the app by leaving a tip in our Tip Jar.
      </Text>
      {/* <Button title="hi" /> */}
      <View style={{ paddingHorizontal: spacing[6] }}>
        <Text style={{ fontSize: 18 }}>🙂 Small tip</Text>
      </View>
    </Screen>
  )
})
