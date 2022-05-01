import React from "react"
import { ViewStyle, TextStyle, Platform } from "react-native"
import Modal, { ModalProps } from "react-native-modal"
import { Button, Text } from "../../../components"
import { translate } from "../../../i18n"
import { color, spacing } from "../../../theme"

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "25%",

  maxHeight: 400,
  padding: spacing[6],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: Platform.select({ ios: 8, android: 4 }),
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
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

export interface TipThanksModalProps extends ModalProps {
  onOk: () => void
}

export const TipThanksModal = function TipThanksModal(props: TipThanksModalProps) {
  return (
    <Modal
      style={MODAL_WRAPPER}
      animationIn="lightSpeedIn"
      animationOut="lightSpeedOut"
      animationInTiming={800}
      animationOutTiming={500}
      {...props}
    >
      <Text style={MODAL_ICON}>🙏</Text>
      <Text style={MODAL_TITLE}>תודה רבה</Text>
      <Text style={MODAL_TEXT}>אני מעריך ומתרגש עם כל שקל שנכנס לצנצנת</Text>
      <Text style={MODAL_TEXT}>שתהיה נסיעה טובה!</Text>
      <Text style={MODAL_TEXT}>גיא</Text>

      <Button title={translate("common.next")} style={MODAL_BUTTON} onPress={props.onOk} />
    </Modal>
  )
}
