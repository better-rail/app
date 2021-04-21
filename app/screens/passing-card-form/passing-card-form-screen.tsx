import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { Screen, Text, TextInput, Button } from "../../components"
import { color, spacing } from "../../theme"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[3],
  flex: 1,
}

export const PassingCardFormScreen = observer(function PassingCardFormScreen() {
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <View style={{ marginBottom: spacing[4] }}>
        <Text preset="fieldLabel" text="תעודת זהות" style={{ marginBottom: spacing[1] }} />
        <TextInput placeholder="מספר תעודת זהות" keyboardType="number-pad" />
      </View>

      <View style={{ marginBottom: spacing[4] }}>
        <Text preset="fieldLabel" text="מס' טלפון" style={{ marginBottom: spacing[1] }} />
        <TextInput placeholder="מספר טלפון" keyboardType="number-pad" textContentType="telephoneNumber" />
      </View>

      <Button title="הזמנת שובר" />
      <Text preset="" text="פרטי הבקשה עוברים ישירות אל המערכת של רכבת ישראל,  ולא נשמרים או נאספים על ידי Better Rail." />
    </Screen>
  )
})
