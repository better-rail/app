import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Image, DynamicColorIOS, Dimensions, ImageStyle, ViewStyle, TextStyle } from "react-native"
import { Screen, Text, Button } from "../../components"
import { VoucherBarcodeScreenProps } from "../../navigators/create-voucher-navigator"
import { color, spacing } from "../../theme"
import { useStores } from "../../models"

const { width: deviceWidth } = Dimensions.get("screen")

const ROOT: ViewStyle = {
  backgroundColor: Platform.select({
    ios: DynamicColorIOS({ light: color.background, dark: color.secondaryBackground }),
    android: color.dim,
  }),
  paddingTop: spacing[4],
  paddingHorizontal: spacing[3],
  flex: 1,
}

const SUCCESS_TEXT: TextStyle = {
  marginBottom: spacing[3],
  textAlign: "center",
}

const BARCODE_IMAGE: ImageStyle = {
  alignSelf: "center",
  backgroundColor: "#fff",
  width: deviceWidth - 80,
  height: deviceWidth - 80,
  resizeMode: "contain",
  borderWidth: 1,
  borderColor: color.dim,
}

const INFO_TEXT: TextStyle = {
  maxWidth: 290,
  alignSelf: "center",
  marginVertical: spacing[4],
  textAlign: "center",
  opacity: 0.9,
}

const CLOSE_BUTTON: ViewStyle = {
  width: deviceWidth - 75,
  alignSelf: "center",
}

export const VoucherBarcodeScreen = observer(function VoucherBarcodeScreen({ navigation }: VoucherBarcodeScreenProps) {
  // Pull in one of our MST stores
  const { voucherDetails } = useStores()

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBar="light-content">
      <Text preset="header" style={SUCCESS_TEXT}>
        השובר מוכן!
      </Text>

      <Image style={BARCODE_IMAGE} source={{ uri: `data:image/png;base64,${voucherDetails.barcodeImage}` }} />
      <Text style={INFO_TEXT}>ניתן לגשת לשובר גם דרך המסך הראשי </Text>
      <Button title="סגירה" style={CLOSE_BUTTON} onPress={() => navigation.dangerouslyGetParent().goBack()} />
    </Screen>
  )
})
