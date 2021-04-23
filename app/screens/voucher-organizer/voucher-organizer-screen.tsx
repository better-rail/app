import React from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { Screen, ListItem } from "../../components"
import { VoucherVoucherScreenProps } from "../../navigators/voucher-navigator"
// import { useStores } from "../../models"
import { color } from "../../theme"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
}

export const VoucherOrganizerScreen = observer(function VoucherOrganizerScreen({ navigator }: VoucherVoucherScreenProps) {
  // const { someStore, anotherStore } = useStores()

  return (
    <Screen style={ROOT} preset="scroll">
      <ListItem onPress={() => null} />
    </Screen>
  )
})
