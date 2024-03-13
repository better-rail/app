import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { CloseButton } from "../../components"
import { AnnouncementsScreen } from "../../screens/announcements/announcements-screen"
import { color, spacing, typography } from "../../theme"
import { Image, Platform, Pressable, TextStyle } from "react-native"
import { translate } from "../../i18n"
import { UrgentAnnouncements } from "../../components/announcements/urgent-announcements"
import { NotificationsPickStationsScreen } from "../../screens/notifications/notifications-pick-stations-screen"
import { NotificationsSetupScreen } from "../../screens/notifications/notifications-setup-screen"

export type AnnouncementsParamList = {
  announcement: undefined
  urgent: undefined
  notificationsSetup: undefined
  notificationsPickStations: undefined
}

const AnnouncementsStack = createStackNavigator()

export type AnnouncementsScreenProps = StackScreenProps<AnnouncementsParamList>

export const AnnouncementsNavigator = () => (
  <AnnouncementsStack.Navigator
    screenOptions={{
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
    }}
  >
    <AnnouncementsStack.Screen
      name="announcement"
      component={AnnouncementsScreen}
      options={({ navigation }) => ({
        title: translate("routes.updates"),
        headerRight: () => (
          <Pressable onPress={() => navigation.navigate("notificationsSetup")}>
            <Image
              source={require("../../../assets/bell.png")}
              style={{
                width: 24,
                height: 27,
                marginRight: spacing[3],
                marginBottom: spacing[2],
                opacity: 0.6,
                tintColor: "#e67e22",
              }}
            />
          </Pressable>
        ),
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing[2] }} />,
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
      })}
    />
    <AnnouncementsStack.Screen
      name="urgent"
      component={UrgentAnnouncements}
      options={({ navigation }) => ({
        title: translate("routes.updates"),
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing[2] }} />,
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
      })}
    />

    <AnnouncementsStack.Screen
      name="notificationsSetup"
      component={NotificationsSetupScreen}
      options={({ navigation }) => ({
        title: "Notifications Settings",
        // headerLeft: () => <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing[2] }} />,
        headerLeftContainerStyle: { marginBottom: 10 },
        headerTitleStyle: Platform.select({
          ios: { ...iOSTitleStyle, marginBottom: 10 },
          android: { ...androidTitleStyle, marginBottom: 10 },
        }),
      })}
    />

    <AnnouncementsStack.Screen
      name="notificationsPickStations"
      component={NotificationsPickStationsScreen}
      options={({ navigation }) => ({
        title: "Select Stations",
        headerShown: false,
      })}
    />
  </AnnouncementsStack.Navigator>
)

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
  marginBottom: 8,
}

const androidTitleStyle: TextStyle = { marginLeft: -18.5, marginBottom: 7.5 }
