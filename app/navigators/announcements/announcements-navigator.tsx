import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { CloseButton } from "../../components"
import { AnnouncementsScreen } from "../../screens/announcements/announcements-screen"
import { color, spacing, typography } from "../../theme"
import { Platform, TextStyle } from "react-native"
import { translate } from "../../i18n"

const AnnouncementsStack = createStackNavigator()

export type AnnouncementsScreenProps = StackScreenProps<{}>

export const AnnouncementsNavigator = () => (
  <AnnouncementsStack.Navigator
    screenOptions={{
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
      headerStatusBarHeight: Platform.select({ ios: 10, android: 5 }),
    }}
  >
    <AnnouncementsStack.Screen
      name="annoncements"
      component={AnnouncementsScreen}
      options={({ navigation }) => ({
        title: translate("routes.updates"),
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing[2] }} />,
        headerTitleStyle: Platform.select({ ios: iOSTitleStyle, android: { ...androidTitleStyle, marginBottom: 10 } }),
      })}
    />
  </AnnouncementsStack.Navigator>
)

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
  marginBottom: 10,
}

const androidTitleStyle: TextStyle = { marginLeft: -18.5, marginBottom: 7.5 }
