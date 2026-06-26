import React from "react"
import { View, Modal, TouchableWithoutFeedback, Dimensions, Platform } from "react-native"
import type { ViewStyle, TextStyle } from "react-native"
import { Button, Text } from "../../../components"
import { translate } from "../../../i18n"
import { color, fontScale, spacing } from "../../../theme"

const { width } = Dimensions.get("window")

const BACKDROP: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
}

const MODAL_WRAPPER: ViewStyle = {
  padding: Platform.select({ ios: spacing[6], android: spacing[5] }),
  marginHorizontal: spacing[4],
  maxWidth: width - spacing[4] * 2,
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.modalBackground,
  borderRadius: Platform.select({ ios: 14, android: 6 }),
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 4,
  shadowOpacity: 0.45,
  elevation: 5,
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
  marginBottom: spacing[3],
  textAlign: "center",
  fontSize: 18,
}

const MODAL_BUTTON: ViewStyle = {
  minWidth: "90%",
}

interface TipThanksModalNativeProps {
  visible: boolean
  onClose: () => void
}

export const TipThanksModalNative = function TipThanksModalNative({ visible, onClose }: TipThanksModalNativeProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={BACKDROP}>
          <TouchableWithoutFeedback>
            <View style={MODAL_WRAPPER}>
              <Text style={MODAL_ICON}>🙏</Text>
              <Text style={MODAL_TITLE} tx="settings.thankYou" />
              <Text style={MODAL_TEXT} tx="settings.thankYouText" />

              <Button
                title={translate("common.close")}
                containerStyle={{ maxHeight: 60 * fontScale }}
                style={MODAL_BUTTON}
                onPress={onClose}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
