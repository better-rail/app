import React from "react"
import { observer } from "mobx-react-lite"
import { FlatList, View, ViewStyle } from "react-native"
import { Screen, ListItem, Text } from "../../components"
import { VoucherVoucherScreenProps } from "../../navigators/voucher-navigator"
import { useStores } from "../../models"
import { Voucher } from "../../models/vouchers"
import { color, spacing } from "../../theme"
import { formatRelative } from "date-fns"
import { he } from "date-fns/locale"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
}

export const VoucherOrganizerScreen = observer(function VoucherOrganizerScreen({ navigation }: VoucherVoucherScreenProps) {
  const { vouchers } = useStores()

  const renderItem = ({ item }: { item: Voucher }) => {
    const subtitle = formatRelative(item.date, new Date(), { locale: he })

    return (
      <ListItem
        onPress={() => navigation.navigate("voucherBarcode", item)}
        title={item.stationName}
        subtitle={subtitle}
        image={{ uri: `data:image/png;base64,${item.barcodeImage}` }}
      />
    )
  }

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true}>
      <FlatList
        data={vouchers.sortedList}
        extraData={vouchers.list?.length}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <ListSeparator />}
        ListFooterComponent={() => <ListSeparator />}
        ListEmptyComponent={() => <ListEmptyComponent />}
        keyExtractor={(item) => item.id}
      />
    </Screen>
  )
})

const ListSeparator = () => <View style={{ height: 1, backgroundColor: color.dimmer }} />
const ListEmptyComponent = () => (
  <View style={{ alignItems: "center", padding: spacing[6] }}>
    <Text>אין שוברי כניסה שמורים</Text>
  </View>
)
