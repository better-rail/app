import { POSTHOG_API_KEY } from "@env"
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
import { PostHogProvider, usePostHog } from "posthog-react-native"
import { posthogOptions } from "../services/analytics"

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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

const NavigationWithTracking = React.forwardRef<NavigationContainerRef<RootParamList>, Partial<React.ComponentProps<typeof NavigationContainer>>>((props, ref) => {
  const posthog = usePostHog()
  const colorScheme = useColorScheme()
  const navigationRef = React.useRef<NavigationContainerRef<RootParamList>>(null)

  React.useImperativeHandle(ref, () => navigationRef.current as NavigationContainerRef<RootParamList>)

  return (
    <NavigationContainer
      {...props}
      ref={navigationRef as any}
      theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      onReady={() => {
        const route = navigationRef.current?.getCurrentRoute()
        if (route?.name) {
          posthog?.screen(route.name)
        }
      }}
      onStateChange={() => {
        const route = navigationRef.current?.getCurrentRoute()
        if (route?.name) {
          posthog?.screen(route.name)
        }
      }}
    >
      <RootStack />
    </NavigationContainer>
  )
})

NavigationWithTracking.displayName = "NavigationWithTracking"

export const RootNavigator = React.forwardRef<NavigationContainerRef<RootParamList>, Partial<React.ComponentProps<typeof NavigationContainer>>>(
  (props, ref) => {
    return (
      <PostHogProvider apiKey={POSTHOG_API_KEY} options={posthogOptions} autocapture={{ captureScreens: false }}>
        <NavigationWithTracking {...props} ref={ref} />
      </PostHogProvider>
    )
  },
)

RootNavigator.displayName = "RootNavigator"
