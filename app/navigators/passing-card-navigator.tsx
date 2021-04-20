import React from "react"
import { createNativeStackNavigator } from "react-native-screens/native-stack"
import { PassingCardFormScreen } from "../screens"
import { color, typography } from "../theme"

export type PassingCardParamList = { passingCardForm: undefined }
const PCardStack = createNativeStackNavigator<PassingCardParamList>()

export const PassingCardNavigator = () => (
  <PCardStack.Navigator screenOptions={{ stackPresentation: "modal" }}>
    <PCardStack.Screen
      name="passingCardForm"
      component={PassingCardFormScreen}
      options={{
        title: "הזמנת שובר כניסה ",
        headerTintColor: color.primary,
        headerTitleStyle: {
          fontSize: 20,
          fontFamily: typography.primary,
        },
      }}
    />
  </PCardStack.Navigator>
)
