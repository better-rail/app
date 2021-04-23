import React from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { VoucherVoucherScreenProps } from "../../navigators/create-Voucher"
// import { useStores } from "../../models"
import { color } from "../../theme"

const ROOT: ViewStyle = {
  backgroundColor: color.palette.black,
  flex: 1,
}

export const VoucherOrganizerScreen = observer(function VoucherOrganizerScreen() {
  // const { someStore, anotherStore } = useStores()

  return (
    <Screen style={ROOT} preset="scroll">
      <Text preset="header" text="" />
    </Screen>
  )
})
