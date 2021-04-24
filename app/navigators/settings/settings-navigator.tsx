import React from "react"
import { TouchableOpacity, Image } from "react-native"
import { createNativeStackNavigator } from "react-native-screens/native-stack"
import { SettingsScreen } from "../../screens"
import { color, typography } from "../../theme"

export type SettingsParamList = {
  main: undefined
}
const SettingsStack = createNativeStackNavigator<SettingsParamList>()

export const SettingsNavigator = () => (
  <SettingsStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      headerTintColor: color.primary,
      headerTitleStyle: { fontSize: 20, fontFamily: typography.primary },
      headerBackTitleStyle: { fontFamily: typography.primary },
    }}
  >
    <SettingsStack.Screen
      name="main"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: "הגדרות",
        headerLeft: () => <CloseIcon onPress={() => navigation.goBack()} />,
      })}
    />
  </SettingsStack.Navigator>
)

const CloseIcon = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה">
    <Image
      source={require("../../../assets/close.png")}
      style={{ width: 37.5, height: 37.5, marginLeft: -10, tintColor: color.dim, opacity: 0.5 }}
    />
  </TouchableOpacity>
)
