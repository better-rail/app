import React, { useCallback, useState, useEffect, useMemo, useRef } from "react"
import { ActivityIndicator, TextStyle, View, Platform, BackHandler, ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { Text, DummyInput, Button } from "../"
import BottomSheet, { BottomSheetBackdrop, BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ProfileCodeBottomSheet } from "./profile-code-bottom-sheet"
import { observer } from "mobx-react-lite"
import { useStores } from "../../models"
import { translate } from "../../i18n"
import { getRouteFare } from "../../services/api/fares-api"
import HapticFeedback from "react-native-haptic-feedback"

const CONTNET: ViewStyle = {
  flex: 1,
  padding: spacing[3],
  backgroundColor: color.background,
  borderRadius: Platform.select({ ios: 14, android: 6 }),
}

const PRICE_DESCRIPTION: TextStyle = {
  alignItems: "center",
  marginTop: spacing[4],
  marginBottom: spacing[3],
}

export interface TicketFaresBottomSheetProps {
  originId: string
  destinationId: string
  closeBottomSheet: () => void
  style?: ViewStyle
}

export const TicketFaresBottomSheet = observer(
  (props: TicketFaresBottomSheetProps, ref: React.ForwardedRef<BottomSheet>) => {
    const { settings } = useStores()
    const insets = useSafeAreaInsets()

    const [routeFare, setRouteFare] = useState(undefined)
    const [isLoading, setIsLoading] = useState(false)

    const profilePickerSheet = useRef<BottomSheet>(null)

    const snapPoints = useMemo(() => [0, (260 + insets.bottom * 0.5) * fontScale], [])

    useEffect(() => {
      setIsLoading(true)
      getRouteFare(props.originId, props.destinationId, settings.profileCode).then((price) => {
        setRouteFare(price)
        setIsLoading(false)
      })
    }, [settings.profileCode])

    const handleSheetChanges = useCallback((index: number) => {
      // Handles back button presses on Android

      const backAction = () => {
        props.closeBottomSheet()
        BackHandler.removeEventListener("hardwareBackPress", backAction)
        return true
      }

      if (index === 1) {
        BackHandler.addEventListener("hardwareBackPress", backAction)
      } else if (index === 0) {
        BackHandler.removeEventListener("hardwareBackPress", backAction)
      }
    }, [])

    return (
      <BottomSheetModalProvider>
        <BottomSheet
          ref={ref}
          index={0}
          onChange={handleSheetChanges}
          snapPoints={snapPoints}
          backdropComponent={BottomSheetBackdrop}
          handleComponent={null}
        >
          <View style={CONTNET}>
            <DummyInput
              label={translate("profileCodes.passengerProfile")}
              value={settings.profileCodeLabel}
              onPress={() => {
                HapticFeedback.trigger("impactLight")
                profilePickerSheet.current.expand()
              }}
            />

            <View style={PRICE_DESCRIPTION}>
              <Text tx="profileCodes.farePerRide" />
              <View style={{ height: 40 * fontScale }}>
                {!isLoading && routeFare ? (
                  <Text preset="header">{routeFare} ₪</Text>
                ) : (
                  <ActivityIndicator size="large" style={{ paddingTop: spacing[2] }} color={color.dim} />
                )}
              </View>
            </View>

            <Text preset="fieldLabel" style={{ textAlign: "center", marginBottom: spacing[3] }} tx="profileCodes.dataSource" />

            <Button
              title={translate("common.close")}
              containerStyle={{ flex: 0, height: 55, opacity: 0.85 }}
              onPress={props.closeBottomSheet}
            />
          </View>
        </BottomSheet>

        <ProfileCodeBottomSheet ref={profilePickerSheet} closeSheet={() => profilePickerSheet.current.close()} />
      </BottomSheetModalProvider>
    )
  },
  { forwardRef: true },
)

TicketFaresBottomSheet.displayName = "TicketFaresBottomSheet"
