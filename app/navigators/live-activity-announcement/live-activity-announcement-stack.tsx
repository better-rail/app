import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { LiveAnnouncementScreen, StartRideAnnouncement, ActivityAnnouncementScreen } from "../../screens"

export type LiveAnnouncementParamList = {
  main: undefined
  startRide: undefined
  liveActivity: undefined
}

const LiveAnnouncementStack = createStackNavigator<LiveAnnouncementParamList>()

export type LiveAnnouncementStackProps = StackScreenProps<LiveAnnouncementParamList, "main">

export const LiveAnnouncementNavigator = () => (
  <LiveAnnouncementStack.Navigator
    screenOptions={({ navigation }) => ({
      headerTransparent: true,
      header: () => null,
      title: "",
    })}
  >
    <LiveAnnouncementStack.Screen name="main" component={LiveAnnouncementScreen} />
    <LiveAnnouncementStack.Screen name="startRide" component={StartRideAnnouncement} />
    <LiveAnnouncementStack.Screen name="liveActivity" component={ActivityAnnouncementScreen} />
  </LiveAnnouncementStack.Navigator>
)
