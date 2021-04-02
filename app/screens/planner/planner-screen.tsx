import React from "react"
import { observer } from "mobx-react-lite"
import { ImageBackground, View, ViewStyle } from "react-native"
import { Screen, Text, DummyInput } from "../../components"
import { useSafeAreaInsets } from "react-native-safe-area-context"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../../models"
import { color, spacing } from "../../theme"

const background = require("../../../assets/planner-background.png")

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

export const PlannerScreen = observer(function PlannerScreen() {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()

  const insets = useSafeAreaInsets()

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true}>
      <ImageBackground source={background} style={[BACKGROUND, { paddingTop: insets.top }]}>
        <View style={CONTENT_WRAPPER}>
          <Text preset="header" text="תכנון מסלול" style={{ marginBottom: spacing[3] }} />
          <DummyInput
            placeholder="תחנת מוצא"
            onPress={() => alert(1)}
            style={{ marginBottom: spacing[3] }}
          />
          <DummyInput
            placeholder="תחנת היעד"
            onPress={() => alert(1)}
            style={{ marginBottom: spacing[3] }}
          />
          <DummyInput placeholder="עכשיו" onPress={() => alert(1)} />
        </View>
      </ImageBackground>
    </Screen>
  )
})
