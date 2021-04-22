import React from "react"
import { observer } from "mobx-react-lite"
import { Image, DynamicColorIOS, Dimensions, ImageStyle, ViewStyle, TextStyle } from "react-native"
import { Screen, Text, Button } from "../../components"
import { VoucherBarcodeScreenProps } from "../../navigators/create-voucher-navigator"
import { color, spacing } from "../../theme"
import { useStores } from "../../models"
import { format } from "date-fns"

const { width: deviceWidth } = Dimensions.get("screen")

const ROOT: ViewStyle = {
  backgroundColor: Platform.select({
    ios: DynamicColorIOS({ light: color.background, dark: color.secondaryBackground }),
    android: color.dim,
  }),
  paddingTop: spacing[4],
  paddingHorizontal: spacing[3],
  flex: 1,
  alignItems: "center",
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
  const { voucherDetails, trainRoutes } = useStores()

  const route = trainRoutes.routes[voucherDetails.routeIndex]

  return (
    <Screen style={ROOT} preset="scroll" unsafe={true} statusBar="light-content">
      <Text preset="header" style={SUCCESS_TEXT}>
        השובר מוכן!
      </Text>
      <Text>שובר כניסה לתחנת {route.trains[0].originStationName}</Text>
      <Text style={{ marginBottom: spacing[4] }}>
        בתאריך {format(route.trains[0].departureTime, "dd/MM/yyyy")} בשעה {format(route.trains[0].departureTime, "HH:mm")}
      </Text>

      <Image style={BARCODE_IMAGE} source={{ uri: `data:image/png;base64,${voucherDetails.barcodeImage}` }} />
      <Text style={INFO_TEXT}>ניתן לגשת לשובר גם דרך המסך הראשי </Text>
      <Button title="סגירה" style={CLOSE_BUTTON} onPress={() => navigation.dangerouslyGetParent().goBack()} />
    </Screen>
  )
})
