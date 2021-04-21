import React from "react"
import { observer } from "mobx-react-lite"
import { Image, DynamicColorIOS, Dimensions, ImageStyle, ViewStyle, TextStyle } from "react-native"
import { Screen, Text, Button } from "../../components"
import { PassingCardBarcodeScreenProps } from "../../navigators/passing-card-navigator"
import { color, spacing } from "../../theme"

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
  width: deviceWidth - 75,
  height: deviceWidth - 75,
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
  width: deviceWidth - 70,
  alignSelf: "center",
}

var base64Icon =
  "data:image/png;base64,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"

export const PassingCardBarcodeScreen = observer(function PassingCardBarcodeScreen({
  navigation,
}: PassingCardBarcodeScreenProps) {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={ROOT} preset="scroll" unsafe={true}>
      <Text preset="header" style={SUCCESS_TEXT}>
        השובר מוכן!
      </Text>

      <Image style={BARCODE_IMAGE} source={{ uri: base64Icon }} />
      <Text style={INFO_TEXT}>ניתן לגשת לשובר דרך המסך הראשי גם אחרי סגירת החלון</Text>
      <Button title="סגירה" style={CLOSE_BUTTON} onPress={() => navigation.dangerouslyGetParent().goBack()} />
    </Screen>
  )
})
