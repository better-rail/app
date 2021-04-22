import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Platform, DynamicColorIOS, I18nManager, Alert } from "react-native"
import { Screen, Text, Button } from "../../components"
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from "react-native-confirmation-code-field"
import { color, spacing } from "../../theme"
import { VoucherTokenScreenProps } from "../../navigators"
import { useStores } from "../../models"
import HapticFeedback from "react-native-haptic-feedback"

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: Platform.select({
    ios: DynamicColorIOS({ light: color.background, dark: color.secondaryBackground }),
    android: color.dim,
  }),
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  flex: 1,
}

const INSTRUCTION_TEXT: TextStyle = {
  textAlign: "center",
  fontSize: 18,
}

const CODE_FIELD_WRAPPER: ViewStyle = {
  // `react-native-confirmation-code-field` supports RTL by default, which is not needed for this input -
  // therefore we have to reset the flex direction.
  flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
  paddingHorizontal: spacing[4],
  marginBottom: spacing[7],
}

const CODE_CELL: TextStyle = {
  width: 50,
  height: 50,
  justifyContent: "center",
  alignItems: "center",
  borderBottomColor: color.dim,
  borderBottomWidth: 2,
}

const CODE_CELL_FOCUSED: ViewStyle = {
  borderBottomColor: color.text,
}

const CODE_CELL_TEXT: TextStyle = {
  fontSize: 28,
  fontWeight: "bold",
}
// #endregion

const CELL_COUNT = 6

export const VoucherTokenScreen = observer(function VoucherTokenScreen({ navigation }: VoucherTokenScreenProps) {
  const { voucherDetails, trainRoutes } = useStores()
  const [submitting, setSubmitting] = useState(false)

  const [token, setToken] = useState("")
  const ref = useBlurOnFulfill({ value: token, cellCount: CELL_COUNT })
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({ value: token, setValue: setToken })

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      const routeItem = trainRoutes.routes[voucherDetails.routeIndex]

      const response = await voucherDetails.requestBarcode(token, routeItem)
      if (response.success) {
        navigation.navigate("voucherBarcode")
        HapticFeedback.trigger("notificationSuccess")
      }
    } catch (err) {
      Alert.alert("התרחשה שגיאה", "אנא וודאו שהפרטים נכונים.\n אם השגיאה ממשיכה להתרחש, אנא דווחו לנו.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBar="light-content">
      <View style={{ marginBottom: spacing[7] }}>
        <Text style={INSTRUCTION_TEXT}>סמס עם קוד מזהה נשלח אל {voucherDetails.phoneNumber}. </Text>
        <Text style={INSTRUCTION_TEXT}>הזינו את הקוד כאן:</Text>
      </View>

      <CodeField
        ref={ref}
        {...props}
        // Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
        value={token}
        autoFocus={true}
        onChangeText={setToken}
        cellCount={CELL_COUNT}
        rootStyle={CODE_FIELD_WRAPPER}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={({ index, symbol, isFocused }) => (
          <View style={[CODE_CELL, isFocused && CODE_CELL_FOCUSED]} key={index} onLayout={getCellOnLayoutHandler(index)}>
            <Text style={CODE_CELL_TEXT}>{symbol || (isFocused ? <Cursor /> : null)}</Text>
          </View>
        )}
      />

      <Button title="המשך" onPress={onSubmit} loading={submitting} disabled={token.length < 5} />
    </Screen>
  )
})
