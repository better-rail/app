import React from "react"
import { Platform, TextStyle } from "react-native"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { SettingsScreen, LanguageScreen, TipJarScreen, AboutScreen, PrivacyScreen } from "../../screens"
import { color, spacing, typography } from "../../theme"
import { translate } from "../../i18n"
import { CloseButton } from "../../components"

export type SettingsParamList = {
  settings: undefined
  language: undefined
  tipJar: undefined
  about: undefined
  privacy: undefined
}

const SettingsStack = createStackNavigator<SettingsParamList>()

export type SettingsScreenProps = StackScreenProps<SettingsParamList, "settings">

export const SettingsNavigator = () => (
  <SettingsStack.Navigator
    screenOptions={{
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
    }}
  >
    <SettingsStack.Screen
      name="settings"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: translate("settings.title"),
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing[2] }} />,
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
      })}
    />
    <SettingsStack.Screen
      name="language"
      component={LanguageScreen}
      options={{
        title: translate("settings.language"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle,
      }}
    />
    <SettingsStack.Screen
      name="tipJar"
      component={TipJarScreen}
      options={{
        title: translate("settings.tipJar"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle,
      }}
    />
    <SettingsStack.Screen
      name="about"
      component={AboutScreen}
      options={{
        title: translate("settings.about"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle,
      }}
    />
    <SettingsStack.Screen
      name="privacy"
      component={PrivacyScreen}
      options={{
        title: translate("settings.privacy"),
        headerLeftContainerStyle: { marginBottom: 6 },
        headerTitleStyle,
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

const headerTitleStyle = Platform.select({ ios: iOSTitleStyle, android: androidTitleStyle })
