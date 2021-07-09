import React, { useCallback, useMemo, forwardRef, useRef } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { color, fontScale, spacing, typography } from "../../theme"
import { Text, DummyInput, Button } from "../"
import BottomSheet, { BottomSheetBackdrop, BottomSheetModalProvider, BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ProfileCodeBottomSheet } from "./profile-code-bottom-sheet"
import { observer } from "mobx-react-lite"
import { useStores } from "../../models"

const CONTNET: ViewStyle = {
  flex: 1,
  padding: spacing[3],
  backgroundColor: color.background,
  borderRadius: 14,
}

const PRICE_DESCRIPTION: TextStyle = {
  alignItems: "center",
  marginTop: spacing[4],
  marginBottom: spacing[4],
}

export interface TicketFaresBottomSheetProps {
  closeBottomSheet: () => void
  style?: ViewStyle
}

export const TicketFaresBottomSheet = observer(
  (props: TicketFaresBottomSheetProps, ref: React.ForwardedRef<BottomSheet>) => {
    const { settings } = useStores()
    const insets = useSafeAreaInsets()
    const profilePickerSheet = useRef<BottomSheet>(null)

    const snapPoints = useMemo(() => [0, (235 + insets.bottom * 0.5) * fontScale], [])

    return (
      <BottomSheetModalProvider>
        <BottomSheet ref={ref} index={0} snapPoints={snapPoints} backdropComponent={BottomSheetBackdrop} handleComponent={null}>
          <View style={CONTNET}>
            <DummyInput
              label="פרופיל נוסע/ת"
              value={settings.profileCodeLabel}
              onPress={() => profilePickerSheet.current.expand()}
            />

            <View style={PRICE_DESCRIPTION}>
              <Text>מחיר הנסיעה לכיוון אחד</Text>
              <Text preset="header">32 ₪</Text>
            </View>

            <Button title="סגירה" containerStyle={{ flex: 0, height: 55, opacity: 0.85 }} onPress={props.closeBottomSheet} />
          </View>
        </BottomSheet>

        <ProfileCodeBottomSheet ref={profilePickerSheet} closeSheet={() => profilePickerSheet.current.close()} />
      </BottomSheetModalProvider>
    )
  },
  { forwardRef: true },
)

TicketFaresBottomSheet.displayName = "TicketFaresBottomSheet"
