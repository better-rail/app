import { TextStyle, View, ViewStyle } from "react-native"
import BottomSheet from "@gorhom/bottom-sheet"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { spacing } from "../../../theme"
import { Button, Text } from "../../../components"
import { forwardRef } from "react"
import { translate } from "../../../i18n"

const ALERT_CONTENT_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  alignItems: "center",
  gap: 16,
  marginBottom: spacing[5],
}

const ALERT_TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
}

export const FirstRideAlert = forwardRef<BottomSheet>((props, ref) => {
  return (
    <BottomSheetModal ref={ref} snapPoints={["65%"]} style={{ paddingVertical: spacing[4], paddingHorizontal: spacing[4] }}>
      <View style={ALERT_CONTENT_WRAPPER}>
        <Text style={{ fontSize: 52 }}>⚠️</Text>
        <Text style={[ALERT_TEXT, { fontWeight: "bold" }]} tx="ride.firstRideAlertP1" />
        <Text style={ALERT_TEXT} tx="ride.firstRideAlertP2" />
        <Text style={ALERT_TEXT} tx="ride.firstRideAlertP3" />
      </View>
      <Button
        style={{ maxHeight: 60 }}
        title={translate("common.ok")}
        onPress={() => {
          ref.current?.close()
        }}
      />
    </BottomSheetModal>
  )
})
