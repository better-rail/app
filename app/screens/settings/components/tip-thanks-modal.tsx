import React from "react"
import { View, Platform } from "react-native"
import type { ViewStyle, TextStyle } from "react-native"
import { Button, Text } from "../../../components"
import { translate } from "../../../i18n"
import { color, fontScale, spacing } from "../../../theme"
import { ModalProps } from "react-native-modalfy"

const MODAL_WRAPPER: ViewStyle = {
  padding: spacing[6],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: Platform.select({ ios: 14, android: 6 }),
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 4,
  shadowOpacity: 0.45,
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

export const TipThanksModal = function TipThanksModal(props: ModalProps) {
  return (
    <View style={MODAL_WRAPPER}>
      <Text style={MODAL_ICON}>🙏</Text>
      <Text style={MODAL_TITLE} tx="settings.thankYou" />
      <Text style={MODAL_TEXT} tx="settings.thankYouText" />

      <Button
        title={translate("common.close")}
        containerStyle={{ maxHeight: 60 * fontScale }}
        style={MODAL_BUTTON}
        onPress={() => props.modal.closeModal()}
      />
    </View>
  )
}
