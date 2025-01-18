import React from "react"
import { useColorScheme } from "react-native"
import { NavigationContainer, type NavigationContainerRef, DefaultTheme, DarkTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainNavigator } from "./main-navigator"
import { SettingsNavigator } from "./settings/settings-navigator"
import { ActiveRideNavigator } from "./active-ride/active-ride-navigator"
import { WidgetOnboardingNavigator } from "./widget-onboarding/widget-onboarding-navigator"
import { PaywallNavigator } from "./paywall/paywall-navigator"
import { LiveAnnouncementNavigator } from "./live-activity-announcement/live-activity-announcement-stack"
import { AnnouncementsNavigator } from "./announcements/announcements-navigator"

export type RootParamList = {
  mainStack: undefined
  secondaryStack: undefined
  settingsStack: undefined
  activeRideStack: undefined
  announcementsStack: undefined
  paywallStack: undefined
  widgetOnboardingStack: undefined
  liveAnnouncementStack: undefined
}

const Stack = createNativeStackNavigator<RootParamList>()

const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="mainStack" component={MainNavigator} />
      <Stack.Group screenOptions={{ presentation: "modal" }}>
        <Stack.Screen name="settingsStack" component={SettingsNavigator} />
        <Stack.Screen name="activeRideStack" component={ActiveRideNavigator} />
        <Stack.Screen name="announcementsStack" component={AnnouncementsNavigator} />
      </Stack.Group>
      <Stack.Group screenOptions={{ presentation: "fullScreenModal" }}>
        <Stack.Screen name="liveAnnouncementStack" component={LiveAnnouncementNavigator} />
        <Stack.Screen name="widgetOnboardingStack" component={WidgetOnboardingNavigator} />
        <Stack.Screen name="paywallStack" component={PaywallNavigator} />
      </Stack.Group>
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
