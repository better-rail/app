import React from "react"
import { TouchableOpacity, Image, Platform } from "react-native"
import { createStackNavigator } from "@react-navigation/stack"
import { SettingsScreen } from "../../screens"
import { color, typography } from "../../theme"

export type SettingsParamList = {
  main: undefined
}

const SettingsStack = createStackNavigator<SettingsParamList>()

export const SettingsNavigator = () => (
  <SettingsStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      headerTintColor: color.primary,
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
      headerBackTitleStyle: { fontFamily: typography.primary },
    }}
  >
    <SettingsStack.Screen
      name="main"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: "הגדרות",
        headerTitleStyle: Platform.select({
          ios: { fontSize: 20, fontFamily: typography.primary, fontWeight: "400", marginRight: 10, marginBottom: 10 },
          android: { marginLeft: -18.5, marginBottom: 10 },
        }),
        headerLeft: () => <CloseIcon onPress={() => navigation.goBack()} />,
      })}
    />
  </SettingsStack.Navigator>
)

const CloseIcon = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה">
    <Image
      source={require("../../../assets/close.png")}
      style={{ width: 37.5, height: 37.5, marginLeft: 7.5, marginBottom: 7.5, tintColor: color.dim, opacity: 0.5 }}
    />
  </TouchableOpacity>
)
