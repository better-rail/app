import React from "react"
import { createStackNavigator, StackScreenProps, TransitionPresets } from "@react-navigation/stack"
import { RouteDetailsScreen } from "../../screens"
import { RouteItem } from "../../services/api"
import { CloseButton } from "../../components"

export type ActiveRideList = {
  activeRide: { routeItem: RouteItem; originId: number; destinationId: number }
}

const ActiveRideStack = createStackNavigator<ActiveRideList>()

export type ActiveRideScreenProps = StackScreenProps<ActiveRideList, "activeRide">

export const ActiveRideNavigator = () => (
  <ActiveRideStack.Navigator>
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
