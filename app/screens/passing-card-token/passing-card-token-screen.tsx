import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Platform, DynamicColorIOS, I18nManager } from "react-native"
import { Screen, Text, Button } from "../../components"
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from "react-native-confirmation-code-field"
import { color, spacing } from "../../theme"
import { PassingCardTokenScreenProps } from "../../navigators"

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

const CELL_COUNT = 6

export const PassingCardTokenScreen = observer(function PassingCardTokenScreen({ navigation }: PassingCardTokenScreenProps) {
  const [token, setToken] = useState("")
  const ref = useBlurOnFulfill({ value: token, cellCount: CELL_COUNT })
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({ value: token, setValue: setToken })

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <View style={{ marginBottom: spacing[7] }}>
        <Text style={INSTRUCTION_TEXT}>סמס עם קוד מזהה נשלח אל 052-8656710. </Text>
        <Text style={INSTRUCTION_TEXT}>הזינו את הקוד כאן:</Text>
      </View>

      <CodeField
        ref={ref}
        {...props}
        // Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
        value={token}
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

      <Button title="המשך" onPress={() => navigation.navigate("passingCardBarcode")} disabled={token.length !== 6} />
    </Screen>
  )
})
