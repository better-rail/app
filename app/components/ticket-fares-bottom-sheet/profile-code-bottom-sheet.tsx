import React, { useMemo } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { color, fontScale, spacing } from "../../theme"
import { Text } from "../"
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SettingBox } from "../../screens/settings/components/settings-box"
import { SETTING_GROUP } from "../../screens/settings"
import { observer } from "mobx-react-lite"
import { useStores, PROFILE_CODES } from "../../models"
import { translate } from "../../i18n"

const CONTNET: ViewStyle = {
  flex: 1,
  padding: spacing[3],
  backgroundColor: color.background,
  borderRadius: 14,
}

const TITLE: TextStyle = { fontSize: 20, fontWeight: "500", marginStart: 2.5, marginBottom: spacing[3] }

export interface ProfileCodeBottomSheetProps {
  closeSheet: () => void
  style?: ViewStyle
}

export const ProfileCodeBottomSheet = observer(
  (props: ProfileCodeBottomSheetProps, ref: React.ForwardedRef<BottomSheet>) => {
    const insets = useSafeAreaInsets()
    const { settings } = useStores()

    const snapPoints = useMemo(() => [0, (480 + insets.bottom * 0.5) * fontScale], [])

    const onSelection = (value: number) => {
      settings.setProfileCode(value)
      props.closeSheet()
    }

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={BottomSheetBackdrop}
        handleComponent={null}
        enableContentPanningGesture={false}
      >
        <View style={CONTNET}>
          <Text style={TITLE} tx="profileCodes.passengerProfile" />

          <View style={SETTING_GROUP}>
            {PROFILE_CODES.map((profile, index) => (
              <SettingBox
                first={index === 0}
                last={index === PROFILE_CODES.length - 1}
                title={translate(profile.label)}
                checkmark={settings.profileCode === profile.value}
                key={profile.value}
                onPress={() => onSelection(profile.value)}
              />
            ))}
          </View>
        </View>
      </BottomSheet>
    )
  },
  { forwardRef: true },
)

ProfileCodeBottomSheet.displayName = "ProfileCodeBottomSheet"
