/**
 * This is the navigator you will modify to display the logged-in screens of your app.
 * You can use RootNavigator to also display an auth flow or other user flows.
 *
 * You'll likely spend most of your time in this file.
 */
import React from "react"
import { createStackNavigator, StackScreenProps, TransitionPresets } from "@react-navigation/stack"
import { PlannerScreen, SelectStationScreen, RouteListScreen, RouteDetailsScreen, SettingsScreen } from "../screens"
import { createSharedElementStackNavigator } from "react-navigation-shared-element"
import { color, spacing, typography } from "../theme"
import { RouteItem } from "../services/api"
import { Platform } from "react-native"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 */
export type PrimaryParamList = {
  planner: undefined
  selectStation: { selectionType: "origin" | "destination" }
  routeList: { originId: string; destinationId: string; time: number }
  routeDetails: { routeItem: RouteItem; originId: string; destinationId: string; date: string; time: string }
  settings: undefined
}

export type PlannerScreenProps = StackScreenProps<PrimaryParamList, "planner">
export type SelectStationScreenProps = StackScreenProps<PrimaryParamList, "selectStation">
export type RouteListScreenProps = StackScreenProps<PrimaryParamList, "routeList">
export type RouteDetailsScreenProps = StackScreenProps<PrimaryParamList, "routeDetails">

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createSharedElementStackNavigator<PrimaryParamList>()

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTitleStyle: {
          fontSize: 20,
          fontFamily: typography.primary,
          marginStart: Platform.select({ android: -22, ios: 0 }),
          marginBottom: Platform.select({ android: 2.5, ios: 0 }),
        },
        headerBackTitleStyle: { fontFamily: typography.primary },
        headerTintColor: color.primary,
        headerTitle: "",
      }}
    >
      <Stack.Screen name="planner" component={PlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="selectStation"
        component={SelectStationScreen}
        options={{ headerShown: false, ...TransitionPresets.ModalTransition }}
      />
      <Stack.Screen
        name="routeList"
        component={RouteListScreen}
        options={{ headerTransparent: true, headerTintColor: "lightgrey" }}
      />
      <Stack.Screen
        name="routeDetails"
        component={RouteDetailsScreen}
        options={{ headerTransparent: true, headerTintColor: "lightgrey", ...TransitionPresets.SlideFromRightIOS }}
        sharedElementsConfig={() => ["route-header"]}
      />

      <Stack.Screen
        name="settings"
        component={SettingsScreen}
        options={{
          headerTitle: "הגדרות",
          headerTruncatedBackTitle: "חזרה",
        }}
      />
    </Stack.Navigator>
  )
}

/**
 * A list of routes from which we're allowed to leave the app when
 * the user presses the back button on Android.
 *
 * Anything not on this list will be a standard `back` action in
 * react-navigation.
 *
 * `canExit` is used in ./app/app.tsx in the `useBackButtonHandler` hook.
 */
const exitRoutes = ["planner"]
export const canExit = (routeName: string) => exitRoutes.includes(routeName)
