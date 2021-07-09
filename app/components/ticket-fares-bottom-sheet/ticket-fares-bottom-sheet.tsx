import React, { useCallback, useMemo, forwardRef } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { color, fontScale, spacing, typography } from "../../theme"
import { Text, DummyInput, Button } from "../"
import BottomSheet, { BottomSheetBackdrop, useBottomSheet } from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
  const snapPoints = useMemo(() => [0, (235 + insets.bottom * 0.5) * fontScale], [])

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index)
  }, [])

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={BottomSheetBackdrop}
      handleComponent={null}
    >
      <View style={CONTNET}>
        <DummyInput label="פרופיל נוסע/ת" value="כללי" />

        <View style={{ marginTop: spacing[4], marginBottom: spacing[4], alignItems: "center" }}>
          <Text>מחיר הנסיעה לכיוון אחד</Text>
          <Text preset="header">32 ₪</Text>
        </View>

        <Button title="סגירה" containerStyle={{ flex: 0, height: 55, opacity: 0.85 }} onPress={props.closeBottomSheet} />
      </View>
    </BottomSheet>
  )
})

TicketFaresBottomSheet.displayName = "TicketFaresBottomSheet"
