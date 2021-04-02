import React from "react"
import { observer } from "mobx-react-lite"
import { TextInput, TextStyle, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../../models"
import { color, spacing, typography } from "../../theme"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
  padding: spacing[3],
}

const SEARCH_BAR: TextStyle = {
  width: "100%",
  padding: spacing[3],
  textAlign: "right",
  fontFamily: typography.primary,
  borderRadius: 8,
  backgroundColor: color.line,
}

export const SelectStationScreen = observer(function SelectStationScreen() {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <TextInput style={SEARCH_BAR} placeholder="חיפוש תחנה" />
    </Screen>
  )
})
