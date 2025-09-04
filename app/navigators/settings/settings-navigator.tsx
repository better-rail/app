import React from "react"
import { Platform } from "react-native"
import { createStackNavigator, type StackScreenProps } from "@react-navigation/stack"
import { SettingsScreen, LanguageScreen, TipJarScreen, AboutScreen, PrivacyScreen } from "../../screens"
import { color, spacing, headerTitleStyle, androidHeaderOptions } from "../../theme"
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
        headerTitleStyle,
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

