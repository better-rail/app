import React from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, DynamicColorIOS, Platform } from "react-native"
import { Screen, Text, TextInput, Button } from "../../components"
import { color, spacing } from "../../theme"

const ROOT: ViewStyle = {
  backgroundColor: Platform.select({
    ios: DynamicColorIOS({ light: color.background, dark: color.secondaryBackground }),
    android: color.dim,
  }),
  paddingTop: spacing[4],
  paddingHorizontal: spacing[3],
  flex: 1,
}

const FORM_NOTICE: TextStyle = {
  marginTop: spacing[2],
  paddingHorizontal: spacing[4],
  textAlign: "center",
  opacity: 0.7,
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
      <Text preset="small" style={FORM_NOTICE}>
        פרטי הבקשה עוברים ישירות אל מערכות רכבת ישראל, ולא נאספים על ידי אפליקציית Better Rail.
      </Text>
      <Text preset="small" style={FORM_NOTICE}>
        האחריות על שמירת הפרטים והנפקת השוברים היא על רכבת ישראל בלבד.
      </Text>
    </Screen>
  )
})
