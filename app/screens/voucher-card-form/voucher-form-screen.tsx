import React, { useState } from "react"
import { View, ViewStyle, TextStyle, DynamicColorIOS, Platform, Alert } from "react-native"
import { Screen, Text, TextInput, Button } from "../../components"
import { observer } from "mobx-react-lite"
import { useStores } from "../../models"
import { VoucherFormScreenProps } from "../../navigators/create-voucher-navigator"
import { color, spacing } from "../../theme"
import isIsraeliIdValid from "israeli-id-validator"
import voucherApi from "../../services/api/voucher-api"

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

export const VoucherFormScreen = observer(function VoucherFormScreen({ navigation }: VoucherFormScreenProps) {
  const { voucherDetails } = useStores()
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState(voucherDetails.userId || "")
  const [phoneNumber, setPhoneNumber] = useState(voucherDetails.phoneNumber || "")

  const isInvalidForm = () => {
    if (phoneNumber.length !== 10 || !isIsraeliIdValid(userId)) return true
    // falsy value means the form is valid
    return false
  }

  const submitForm = () => {
    setSubmitting(true)

    if (userId !== voucherDetails.userId) {
      voucherDetails.setUserId(userId)
    }

    if (phoneNumber !== voucherDetails.phoneNumber) {
      voucherDetails.setPhoneNumber(phoneNumber)
    }
    navigation.navigate("VoucherToken")
    // voucherDetails
    //   .requestToken(userId, phoneNumber)
    //   .then((result) => {
    //     if (result.success) {
    //     } else {
    //       Alert.alert("התרחשה שגיאה", "אנא וודאו שהפרטים נכונים.\n אם השגיאה ממשיכה להתרחש, אנא דווחו לנו.")
    //     }
    //   })
    //   .catch((err) => {
    //     console.error(err)
    //   })
    //   .finally(() => {
    //     setSubmitting(false)
    //   })
  }

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBar="light-content">
      <View style={{ marginBottom: spacing[4] }}>
        <Text preset="fieldLabel" text="תעודת זהות" style={{ marginBottom: spacing[1] }} />
        <TextInput placeholder="מספר תעודת זהות" defaultValue={userId} onChangeText={setUserId} keyboardType="number-pad" />
      </View>

      <View style={{ marginBottom: spacing[4] }}>
        <Text preset="fieldLabel" text="מס׳ טלפון נייד" style={{ marginBottom: spacing[1] }} />
        <TextInput placeholder="מספר טלפון " defaultValue={phoneNumber} onChangeText={setPhoneNumber} keyboardType="number-pad" />
      </View>

      <Button title="הזמנת שובר" onPress={submitForm} loading={submitting} disabled={isInvalidForm()} />

      <Text preset="small" style={FORM_NOTICE}>
        פרטי הבקשה עוברים ישירות אל מערכות רכבת ישראל ולא נאספים על ידי אפליקציית Better Rail
      </Text>
      <Text preset="small" style={FORM_NOTICE}>
        האחריות על שמירת הפרטים והנפקת השוברים היא על רכבת ישראל בלבד
      </Text>
    </Screen>
  )
})
