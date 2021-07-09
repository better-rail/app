import React, { useCallback, useMemo, forwardRef, useRef } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { color, fontScale, spacing, typography } from "../../theme"
import { Text, DummyInput, Button } from "../"
import BottomSheet, { BottomSheetBackdrop, BottomSheetModalProvider, BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SettingBox } from "../../screens/settings/components/settings-box"
import { SETTING_GROUP } from "../../screens/settings"

const CONTNET: ViewStyle = {
  flex: 1,
  padding: spacing[3],
  backgroundColor: color.background,
  borderRadius: 14,
}

export interface TicketFaresBottomSheetProps {
  closeBottomSheet: () => void
  style?: ViewStyle
}

export const TicketFaresBottomSheet = forwardRef<BottomSheet, TicketFaresBottomSheetProps>((props, ref) => {
  const insets = useSafeAreaInsets()
  const profilePickerModal = useRef<BottomSheet>(null)
  const profileTypeSelect = useRef<RNPickerSelect>(null)

  const snapPoints = useMemo(() => [0, (235 + insets.bottom * 0.5) * fontScale], [])
  const profilePickerSnapPoints = useMemo(() => [0, (480 + insets.bottom * 0.5) * fontScale], [])

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index)
  }, [])

  return (
    <BottomSheetModalProvider>
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backdropComponent={BottomSheetBackdrop}
        handleComponent={null}
      >
        <View style={CONTNET}>
          <DummyInput label="פרופיל נוסע/ת" value="כללי" onPress={() => profilePickerModal.current.expand()} />

          <View style={{ marginTop: spacing[4], marginBottom: spacing[4], alignItems: "center" }}>
            <Text>מחיר הנסיעה לכיוון אחד</Text>
            <Text preset="header">32 ₪</Text>
          </View>

          <Button title="סגירה" containerStyle={{ flex: 0, height: 55, opacity: 0.85 }} onPress={props.closeBottomSheet} />
        </View>
      </BottomSheet>

      <BottomSheet
        ref={profilePickerModal}
        index={0}
        snapPoints={profilePickerSnapPoints}
        onChange={handleSheetChanges}
        backdropComponent={BottomSheetBackdrop}
        handleComponent={null}
        enableContentPanningGesture={false}
      >
        <View style={CONTNET}>
          <Text style={{ fontSize: 20, fontWeight: "500", marginStart: 2.5, marginBottom: spacing[3] }}>פרופיל נוסע/ת</Text>

          <View style={SETTING_GROUP}>
            <SettingBox first title="כללי" checkmark />
            <SettingBox title="אזרח ותיק" />
            <SettingBox title="נכה" />
            <SettingBox title="סטודנט רגיל" />
            <SettingBox title="אזרח ותיק" />
            <SettingBox title="נוער עד גיל 18" />
            <SettingBox title="זכאי ביטוח לאומי" last />
          </View>
        </View>
      </BottomSheet>
    </BottomSheetModalProvider>
  )
})

TicketFaresBottomSheet.displayName = "TicketFaresBottomSheet"
