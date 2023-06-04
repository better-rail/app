import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { LiveAnnouncementScreen } from "../../screens"

export type LiveAnnouncementParamList = {
  main: undefined
}

const LiveAnnouncementStack = createStackNavigator<LiveAnnouncementParamList>()

export type WidgetOnboardingStackProps = StackScreenProps<LiveAnnouncementParamList, "main">

export const LiveAnnouncementNavigator = () => (
  <LiveAnnouncementStack.Navigator
    screenOptions={({ navigation }) => ({
      headerTransparent: true,
      header: () => null,
      title: "",
    })}
  >
    <LiveAnnouncementStack.Screen name="main" component={LiveAnnouncementScreen} />
  </LiveAnnouncementStack.Navigator>
)
