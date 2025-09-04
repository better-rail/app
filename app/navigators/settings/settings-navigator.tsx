import React from "react"
import { Platform, type TextStyle } from "react-native"
import { createStackNavigator, type StackScreenProps } from "@react-navigation/stack"
import { SettingsScreen, LanguageScreen, TipJarScreen, AboutScreen, PrivacyScreen } from "../../screens"
import { color, spacing, typography } from "../../theme"
import { translate } from "../../i18n"
import { CloseButton } from "../../components"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

const SettingsStack = createStackNavigator<SettingsParamList>()

export type SettingsScreenProps = StackScreenProps<SettingsParamList, "settings">

export const SettingsNavigator = () => (
  <SettingsStack.Navigator
    screenOptions={{
      headerTintColor: color.primary,
      headerBackButtonDisplayMode: "minimal",
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
        ...androidHeaderOptions,
      })}
    />
    <SettingsStack.Screen
      name="language"
      component={LanguageScreen}
      options={{
        title: translate("settings.language"),
        headerTitleStyle,
        ...androidHeaderOptions,
      }}
    />
    <SettingsStack.Screen
      name="tipJar"
      component={TipJarScreen}
      options={{
        title: translate("settings.tipJar"),
        headerTitleStyle,
        ...androidHeaderOptions,
      }}
    />
    <SettingsStack.Screen
      name="about"
      component={AboutScreen}
      options={{
        title: translate("settings.about"),
        headerTitleStyle,
        ...androidHeaderOptions,
      }}
    />
    <SettingsStack.Screen
      name="privacy"
      component={PrivacyScreen}
      options={{
        title: translate("settings.privacy"),
        headerTitleStyle,
        ...androidHeaderOptions,
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

const androidTitleStyle: TextStyle = { 
  marginLeft: -6, 
  marginBottom: 7.5, 
  marginTop: 40 
}

const headerTitleStyle = Platform.select({ ios: iOSTitleStyle, android: androidTitleStyle })

const androidHeaderOptions = {
  headerLeftContainerStyle: { marginTop: 40, marginBottom: 6 },
  headerStyle: { height: 96 },
}
