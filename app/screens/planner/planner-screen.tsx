import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { ImageBackground, View, ViewStyle } from "react-native"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { Screen, Text, DummyInput } from "../../components"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import { PlannerScreenProps } from "../../navigators/main-navigator"

const background = require("../../../assets/planner-background.png")
const today = new Date()
// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.transparent,
  flex: 1,
}

const BACKGROUND: ViewStyle = {
  width: "100%",
  flex: 1,
}

const CONTENT_WRAPPER: ViewStyle = {
  flex: 1,
  marginTop: 200,
  padding: spacing[4],
  backgroundColor: color.line,
  borderRadius: 20,
}
// #endregion

export const PlannerScreen = observer(function PlannerScreen({ navigation }: PlannerScreenProps) {
  const { routePlan } = useStores()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)
  const insets = useSafeAreaInsets()

  const handleConfirm = (date) => {
    routePlan.setDate(date)
    setDatePickerVisibility(false)
  }

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true}>
      <ImageBackground source={background} style={[BACKGROUND, { paddingTop: insets.top }]}>
        <View style={CONTENT_WRAPPER}>
          <Text preset="header" text="תכנון מסלול" style={{ marginBottom: spacing[3] }} />
          <DummyInput
            placeholder="תחנת מוצא"
            value={routePlan.origin?.name}
            onPress={() => navigation.navigate("selectStation", { selectionType: "origin" })}
            style={{ marginBottom: spacing[3] }}
          />
          <DummyInput
            placeholder="תחנת היעד"
            onPress={() => navigation.navigate("selectStation", { selectionType: "destination" })}
            value={routePlan.destination?.name}
            style={{ marginBottom: spacing[3] }}
          />
          <DummyInput placeholder="עכשיו" onPress={() => setDatePickerVisibility(true)} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            onConfirm={handleConfirm}
            onCancel={() => setDatePickerVisibility(false)}
            locale={"he_IL"}
            minimumDate={today}
            customHeaderIOS={() => null}
            customCancelButtonIOS={() => null}
            confirmTextIOS="אישור"
          />
        </View>
      </ImageBackground>
    </Screen>
  )
})
