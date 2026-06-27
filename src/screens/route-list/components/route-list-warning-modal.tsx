import { Modal, View, type ViewStyle, type TextStyle } from "react-native"
import { color, fontScale } from "@/theme"
import { spacing } from "@/theme"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"

export type WarningType = "different-hour" | "different-date"

export interface RouteListWarningModalProps {
  visible: boolean
  warningType: WarningType
  formattedRoutesDate: string
  onClose: () => void
}

const MODAL_OVERLAY: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
}

const MODAL_WRAPPER: ViewStyle = {
  maxHeight: 400,
  padding: spacing[4],
  marginHorizontal: spacing[3],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.modalBackground,
  borderRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
  shadowOpacity: 0.45,
  elevation: 6,
}

const MODAL_ICON: TextStyle = {
  fontSize: 72.5,
}

const MODAL_TITLE: TextStyle = {
  marginBottom: spacing[2],
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
}

const MODAL_TEXT: TextStyle = {
  marginBottom: spacing[4],
  textAlign: "center",
  fontSize: 18,
}

const MODAL_BUTTON: ViewStyle = {
  minWidth: "80%",
}

export function RouteListWarningModal({ visible, warningType, formattedRoutesDate, onClose }: RouteListWarningModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={MODAL_OVERLAY}>
        <View style={MODAL_WRAPPER}>
          <Text style={MODAL_ICON}>⚠️</Text>
          <Text
            style={MODAL_TITLE}
            tx={warningType === "different-hour" ? "modals.noTrainsFoundForHour" : "modals.noTrainsFoundForDate"}
          />
          <Text style={MODAL_TEXT}>
            {warningType === "different-hour" ? (
              translate("modals.foundTrainsAtHour")
            ) : (
              <>
                {translate("modals.foundTrainsAtDate")}
                {formattedRoutesDate}
              </>
            )}
          </Text>
          <Button
            title={translate("common.ok")}
            containerStyle={{ maxHeight: 60 * fontScale }}
            style={MODAL_BUTTON}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  )
}
