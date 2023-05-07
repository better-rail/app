import React from "react"
import { useColorScheme } from "react-native"
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainNavigator } from "./main-navigator"
import { SettingsNavigator } from "./settings/settings-navigator"
import { WidgetOnboardingNavigator } from "./widget-onboarding/widget-onboarding-navigator"

export type RootParamList = {
  mainStack: undefined
  secondaryStack: undefined
  settingsStack: undefined
  widgetOnboardingStack: undefined
}

const Stack = createNativeStackNavigator<RootParamList>()

const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="mainStack" component={MainNavigator} />
      <Stack.Screen name="settingsStack" component={SettingsNavigator} />
      <Stack.Screen name="widgetOnboardingStack" component={WidgetOnboardingNavigator} />
    </Stack.Navigator>
  )
}

export const RootNavigator = React.forwardRef<NavigationContainerRef, Partial<React.ComponentProps<typeof NavigationContainer>>>(
  (props, ref) => {
    const colorScheme = useColorScheme()

    return (
      <NavigationContainer {...props} ref={ref} theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <RootStack />
      </NavigationContainer>
    )
  },
)

RootNavigator.displayName = "RootNavigator"
