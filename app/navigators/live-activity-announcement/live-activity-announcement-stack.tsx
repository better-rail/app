import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { StartRideAnnouncement, ActivityAnnouncementScreen, DynamicIslandScreen, SupportUsScreen } from "../../screens"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { CloseButton } from "../../components"
import { useIsDarkMode } from "../../hooks"
import { Platform } from "react-native"
import { LiveAnnouncementScreen } from "../../screens/live-announcement/live-announcement-screen"

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
      headerBackground: () => (Platform.OS === "ios" ? <LiveAnnouncementHeaderBackground /> : null),
      title: "",
      ...(Platform.OS === "ios" && {
        headerLeft: () => {
          if (Platform.OS === "android") return null
          return (
            <CloseButton
              onPress={() => navigation.popTo("mainStack", { screen: "planner" })}
              iconStyle={{
                width: 32.5,
                height: 32.5,
                tintColor: Platform.select({ ios: "white", android: "grey" }),
                opacity: 0.5,
                marginTop: 8,
              }}
            />
          )
        },
      }),
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
