import React from "react"
import { createStackNavigator, StackScreenProps, TransitionPresets } from "@react-navigation/stack"
import { RouteDetailsScreen } from "../../screens"
import CloseButton from "../../components/close-button/close-button"
import { RouteItem } from "../../services/api"

export type ActiveRideList = {
  activeRide: { routeItem: RouteItem; originId: number; destinationId: number }
}

const ActiveRideStack = createStackNavigator<ActiveRideList>()

export type ActiveRideScreenProps = StackScreenProps<ActiveRideList, "activeRide">

export const ActiveRideNavigator = () => (
  <ActiveRideStack.Navigator
    screenOptions={{
      stackPresentation: "modal",
    }}
  >
    <ActiveRideStack.Screen
      name="activeRide"
      component={RouteDetailsScreen}
      options={({ navigation }) => ({
        headerTransparent: true,
        title: "",
        headerStatusBarHeight: 16,
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} iconStyle={{ tintColor: "white" }} />,
        ...TransitionPresets.ModalSlideFromBottomIOS,
      })}
    />
  </ActiveRideStack.Navigator>
)
