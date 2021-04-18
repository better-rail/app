import React from "react"
import { useColorScheme } from "react-native"
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from "@react-navigation/native"
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack"
import { MainNavigator } from "./main-navigator"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * We recommend using MobX-State-Tree store(s) to handle state rather than navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 */
export type RootParamList = { mainStack: undefined }

const Stack = createStackNavigator<RootParamList>()

const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.ScaleFromCenterAndroid,
      }}
    >
      <Stack.Screen name="mainStack" component={MainNavigator} />
    </Stack.Navigator>
  )
}

export const RootNavigator = React.forwardRef<NavigationContainerRef, Partial<React.ComponentProps<typeof NavigationContainer>>>(
  (props, ref) => {
    const colorScheme = useColorcolorScheme()

    return (
      <NavigationContainer {...props} ref={ref} theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <RootStack />
      </NavigationContainer>
    )
  },
)

RootNavigator.displayName = "RootNavigator"
