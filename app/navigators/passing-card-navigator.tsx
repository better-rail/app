import React from "react"
import { createNativeStackNavigator, NativeStackNavigationProp } from "react-native-screens/native-stack"
import { PassingCardFormScreen, PassingCardTokenScreen } from "../screens"
import { color, typography } from "../theme"

export type PassingCardParamList = { passingCardForm: undefined; passingCardToken: undefined }
const PCardStack = createNativeStackNavigator<PassingCardParamList>()

export type PassingCardFormScreenProps = NativeStackNavigationProp<PassingCardParamList, "passingCardForm">

export const PassingCardNavigator = () => (
  <PCardStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      title: "הזמנת שובר כניסה",
      headerTintColor: color.primary,
      headerTitleStyle: {
        fontSize: 20,
        fontFamily: typography.primary,
      },
    }}
  >
    <PCardStack.Screen name="passingCardForm" component={PassingCardFormScreen} />
    <PCardStack.Screen
      name="passingCardToken"
      component={PassingCardTokenScreen}
      options={{ stackPresentation: "push", headerBackTitle: "חזרה", title: "אישור קוד מזהה" }}
    />
  </PCardStack.Navigator>
)
