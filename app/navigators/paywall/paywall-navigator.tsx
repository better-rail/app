import React from "react"
import {
  createStackNavigator,
  StackHeaderInterpolatedStyle,
  StackHeaderInterpolationProps,
  StackScreenProps,
} from "@react-navigation/stack"
import { PaywallScreen } from "../../screens/paywall"

export type PaywallParamList = {
  paywall: undefined
}

const PaywallStack = createStackNavigator<PaywallParamList>()

export type PaywallScreenProps = StackScreenProps<PaywallParamList, "paywall">

export const PaywallNavigator = () => (
  <PaywallStack.Navigator>
    <PaywallStack.Screen
      name="paywall"
      component={PaywallScreen}
      options={({ navigation }) => ({
        // title: "",
        headerTransparent: true,
        // title: "Profile",
        // headerLeft: () => (
        //   <CloseButton onPress={() => navigation.goBack()} style={{ marginStart: 6 }} iconStyle={{ tintColor: "grey" }} />
        // ),
      })}
    />
  </PaywallStack.Navigator>
)
