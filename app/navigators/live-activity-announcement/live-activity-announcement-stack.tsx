import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import {
  LiveAnnouncementScreen,
  StartRideAnnouncement,
  ActivityAnnouncementScreen,
  DynamicIslandScreen,
  SupportUsScreen,
} from "../../screens"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { CloseButton } from "../../components"
import { useIsDarkMode } from "../../hooks"

export type LiveAnnouncementParamList = {
  main: undefined
  startRide: undefined
  liveActivity: undefined
  dynamicIsland: undefined
  supportUs: undefined
}

const LiveAnnouncementStack = createStackNavigator<LiveAnnouncementParamList>()

export type LiveAnnouncementStackProps = StackScreenProps<LiveAnnouncementParamList, "main">

export const LiveAnnouncementNavigator = () => (
  <LiveAnnouncementStack.Navigator
    screenOptions={({ navigation }) => ({
      headerTransparent: true,
      headerLeft: () => (
        <CloseButton
          onPress={() => navigation.navigate("planner")}
          iconStyle={{ width: 32.5, height: 32.5, tintColor: "white", opacity: 0.5, marginTop: 8 }}
        />
      ),
      headerBackground: () => <LiveAnnouncementHeaderBackground />,
      title: "",
    })}
  >
    <LiveAnnouncementStack.Screen name="main" component={LiveAnnouncementScreen} />
    <LiveAnnouncementStack.Screen name="startRide" component={StartRideAnnouncement} />
    <LiveAnnouncementStack.Screen name="liveActivity" component={ActivityAnnouncementScreen} />
    <LiveAnnouncementStack.Screen name="dynamicIsland" component={DynamicIslandScreen} />
    <LiveAnnouncementStack.Screen name="supportUs" component={SupportUsScreen} />
  </LiveAnnouncementStack.Navigator>
)

const LiveAnnouncementHeaderBackground = () => {
  const insets = useSafeAreaInsets()
  const isDarkMode = useIsDarkMode()
  const blurType = isDarkMode ? "materialDark" : "thinMaterialDark"

  return <BlurView style={{ height: insets.top }} blurType={blurType} blurAmount={10} />
}
