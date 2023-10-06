import { Dimensions, TextStyle, View, ViewStyle } from "react-native"
import BottomSheet, { BottomSheetView, useBottomSheetDynamicSnapPoints } from "@gorhom/bottom-sheet"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { color, spacing } from "../../../theme"
import { Button, Text } from "../../../components"
import { forwardRef, useMemo } from "react"
import { translate } from "../../../i18n"

const ALERT_CONTENT_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[4],
  alignItems: "center",
  gap: 16,
  flex: 1,
  backgroundColor: color.tertiaryBackground,
}

const ALERT_TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.text,
}

export const FirstRideAlert = forwardRef<BottomSheet>((props, ref) => {
  return (
    <BottomSheetModal ref={ref} enableDynamicSizing>
      <BottomSheetView>
        <View style={ALERT_CONTENT_WRAPPER}>
          <Text style={{ fontSize: 52 }}>⚠️</Text>
          <Text style={[ALERT_TEXT, { fontWeight: "bold" }]} tx="ride.firstRideAlertP1" />
          <Text style={ALERT_TEXT} tx="ride.firstRideAlertP2" />
          <Text style={ALERT_TEXT} tx="ride.firstRideAlertP3" />
          <Button
            style={{ maxHeight: 60, minWidth: "100%", marginBottom: spacing[5] }}
            title={translate("common.ok")}
            onPress={() => {
              ref.current?.close()
            }}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
})
