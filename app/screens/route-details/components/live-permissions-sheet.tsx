import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"
import { Button, Text } from "../../../components"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { useEffect, useRef } from "react"
import { FirstRideAlert } from "./first-ride-alert"
import { TextStyle, Touchable, View, ViewStyle } from "react-native"
import { color, spacing } from "../../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"

const WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[4],
  alignItems: "center",
  gap: 16,
  flex: 1,
}

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.text,
}

export function LivePermissionsSheet() {
  const bottomSheetRef = useRef<BottomSheet>(null)

  return (
    <>
      {/* <FirstRideAlert ref={bottomSheetRef} /> */}
      <BottomSheetModal ref={bottomSheetRef}>
        <BottomSheetView style={WRAPPER}>
          <Text tx="ride.notificationPermission1" style={TEXT} />
          <Text tx="ride.notificationPermission2" style={TEXT} />

          <View style={{ width: "100%", gap: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>תצוגת נוטיפקציות</Text>
              <PermissionButton />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>נוטיפקציות מדויקות</Text>
              <PermissionButton />
            </View>
          </View>
          <Button title="התחלת נסיעה" containerStyle={{ width: "100%" }} style={{ maxHeight: 60 }} />
        </BottomSheetView>
      </BottomSheetModal>
      <Button title="open" onPress={() => bottomSheetRef.current?.expand()} />
    </>
  )
}

const PERMISSION_BUTTON_WRAPPER: ViewStyle = {
  width: 120,
  height: 60,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 6,
}

const PermissionButton = ({ permitted = false }) => {
  const backgroundColor = permitted ? color.success : color.error

  return (
    <TouchableOpacity style={[PERMISSION_BUTTON_WRAPPER, { backgroundColor }]}>
      <Text preset="bold" style={{ color: color.whiteText }}>
        אישור
      </Text>
    </TouchableOpacity>
  )
}
