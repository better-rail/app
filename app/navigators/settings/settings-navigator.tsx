import React from "react"
import { TouchableOpacity, Image, Platform } from "react-native"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { SettingsScreen, LanguageScreen, AboutScreen } from "../../screens"
import { color, typography } from "../../theme"
import { translate } from "../../i18n"

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
      headerTitleStyle: Platform.select({
        ios: { fontSize: 19, fontFamily: typography.primary, fontWeight: "400", marginRight: 10, marginBottom: 10 },
        android: { marginLeft: -18.5, marginBottom: 10 },
      }),
    }}
  >
    <SettingsStack.Screen
      name="main"
      component={SettingsScreen}
      options={({ navigation }) => ({
        title: translate("settings.title"),
        headerLeft: () => <CloseIcon onPress={() => navigation.goBack()} />,
      })}
    />
    <SettingsStack.Screen
      name="language"
      component={LanguageScreen}
      options={{
        title: translate("settings.language"),
        headerLeftContainerStyle: { marginBottom: 6 },
      }}
    />
    <SettingsStack.Screen
      name="about"
      component={AboutScreen}
      options={{
        title: translate("settings.about"),
        headerLeftContainerStyle: { marginBottom: 6 },
      }}
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
