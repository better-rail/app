import React from "react"
import { StackScreenProps } from "@react-navigation/stack"
import { createNativeStackNavigator, NativeStackNavigationProp } from "react-native-screens/native-stack"
import { VoucherFormScreen, VoucherTokenScreen, VoucherBarcodeScreen } from "../screens"
import { color, typography } from "../theme"

export type VoucherParamList = { voucherForm: undefined; voucherToken: undefined; voucherBarcode: undefined }
const VoucherStack = createNativeStackNavigator<VoucherParamList>()

export type VoucherFormScreenProps = StackScreenProps<VoucherParamList, "voucherForm">
export type VoucherTokenScreenProps = StackScreenProps<VoucherParamList, "voucherToken">
export type VoucherBarcodeScreenProps = StackScreenProps<VoucherParamList, "voucherBarcode">

export const CreateVoucherNavigator = () => (
  <VoucherStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      title: "הזמנת שובר כניסה",
      headerTintColor: color.primary,
      headerTitleStyle: { fontSize: 20, fontFamily: typography.primary },
      headerBackTitleStyle: { fontFamily: typography.primary },
    }}
  >
    <VoucherStack.Screen name="voucherForm" component={VoucherFormScreen} />
    <VoucherStack.Screen
      name="voucherToken"
      component={VoucherTokenScreen}
      options={{ stackPresentation: "push", headerBackTitle: "חזרה" }}
    />
    <VoucherStack.Screen
      name="voucherBarcode"
      component={VoucherBarcodeScreen}
      options={{ stackPresentation: "push", headerHideBackButton: true }}
    />
  </VoucherStack.Navigator>
)
