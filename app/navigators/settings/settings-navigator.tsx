import React from "react"
import { Platform, TextStyle } from "react-native"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { SettingsScreen, LanguageScreen, AboutScreen } from "../../screens"
import { color, typography } from "../../theme"
import { translate } from "../../i18n"
import CloseButton from "../../components/close-button/close-button"

export type SettingsParamList = {
  main: undefined
  language: undefined
  about: undefined
}

const SettingsStack = createStackNavigator<SettingsParamList>()

export type SettingsScreenProps = StackScreenProps<SettingsParamList, "main">

export const SettingsNavigator = () => (
  <SettingsStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
    }}
  >
    <SettingsStack.Screen
      name="main"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: translate("settings.title"),
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
      })}
    />
    <SettingsStack.Screen
      name="language"
      component={LanguageScreen}
      options={{
        title: translate("settings.language"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: androidTitleStyle }),
      }}
    />
    <SettingsStack.Screen
      name="about"
      component={AboutScreen}
      options={{
        title: translate("settings.about"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: androidTitleStyle }),
      }}
    />
  </SettingsStack.Navigator>
)

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
  marginBottom: 10,
}

const androidTitleStyle: TextStyle = { marginLeft: -18.5, marginBottom: 7.5 }
