/**
 * This is the navigator you will modify to display the logged-in screens of your app.
 * You can use RootNavigator to also display an auth flow or other user flows.
 *
 * You'll likely spend most of your time in this file.
 */
import React from "react"
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack"
import { PlannerScreen, SelectStationScreen, RouteListScreen, RouteDetailsScreen, StationHoursScreen } from "../screens"
import { color, typography } from "../theme"
import { Platform } from "react-native"
import { RouteDetailsTrainInfo } from "../screens/route-details/route-details-train-info"
import type { RouteItem, Train } from "../services/api/rail-api.types"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

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
  routeList: { originId: string; destinationId: string; time: number; enableQuery?: boolean }
  routeDetails: { routeItem: RouteItem; originId: string; destinationId: string }
  routeDetailsTrainInfo: { train: Train }
  stationHours: { stationId: string }
  settings: undefined
}

export type PlannerScreenProps = NativeStackScreenProps<PrimaryParamList, "planner">
export type SelectStationScreenProps = NativeStackScreenProps<PrimaryParamList, "selectStation">
export type RouteListScreenProps = NativeStackScreenProps<PrimaryParamList, "routeList">
export type RouteDetailsScreenProps = NativeStackScreenProps<PrimaryParamList, "routeDetails">
export type RouteDetailsTrainInfoScreenProps = NativeStackScreenProps<PrimaryParamList, "routeDetailsTrainInfo">
export type StationHoursScreenProps = NativeStackScreenProps<PrimaryParamList, "stationHours">

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<PrimaryParamList>()

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: {
          fontSize: 20,
          fontFamily: typography.primary,
          marginStart: Platform.select({ android: -22, ios: 0 }),
          marginBottom: Platform.select({ android: 2.5, ios: 0 }),
        },
        headerBackTitleStyle: { fontFamily: typography.primary },
        headerTintColor: color.primary as unknown as string,
        headerTitle: "",
      }}
    >
      <Stack.Screen name="planner" component={PlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="selectStation"
        component={SelectStationScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="routeList"
        component={RouteListScreen}
        options={{ headerTransparent: true, headerTintColor: "lightgrey" }}
      />
      <Stack.Screen
        name="routeDetails"
        component={RouteDetailsScreen}
        options={{ headerTransparent: true, headerTintColor: "lightgrey" }}
      />

      <Stack.Screen
        name="routeDetailsTrainInfo"
        component={RouteDetailsTrainInfo}
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.35],
          contentStyle: { backgroundColor: color.background },
        }}
      />
      <Stack.Screen
        name="stationHours"
        component={StationHoursScreen}
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: isLiquidGlassSupported ? "transparent" : color.background },
          sheetGrabberVisible: true,
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
