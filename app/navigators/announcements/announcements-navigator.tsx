import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { CloseButton } from "../../components"
import { AnnouncementsScreen } from "../../screens/announcements/announcements-screen"
import { color, spacing, iOSTitleStyle, androidTitleStyle, androidHeaderOptions } from "../../theme"
import { Image, Platform, Pressable, TextStyle } from "react-native"
import { translate } from "../../i18n"
import { UrgentAnnouncements } from "../../components/announcements/urgent-announcements"
import { NotificationsSelectStationsScreen } from "../../screens/notifications/notifications-select-stations-screen"
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
      headerBackButtonDisplayMode: "minimal",
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
    }}
  >
    <AnnouncementsStack.Screen
      name="announcement"
      component={AnnouncementsScreen}
      options={({ navigation }) => ({
        title: translate("routes.updates"),
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate("notificationsSetup")}
            aria-label={translate("announcements.notifications.notificationSettings")}
          >
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
        headerLeft: () => (
          <CloseButton
            onPress={() => navigation.goBack()}
            style={{ marginRight: Platform.select({ ios: spacing[2], android: spacing[5] }) }}
          />
        ),
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
        ...androidHeaderOptions,
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
        title: translate("announcements.notifications.notificationSettings"),
        headerTitleStyle: Platform.select({
          ios: iOSTitleStyle,
          android: { ...androidTitleStyle, marginBottom: 1 }
        }),
        ...androidHeaderOptions,
      })}
    />

    <AnnouncementsStack.Screen
      name="notificationsPickStations"
      component={NotificationsSelectStationsScreen}
      options={({ navigation }) => ({
        title: "Select Stations",
        headerShown: false,
      })}
    />
  </AnnouncementsStack.Navigator>
)


