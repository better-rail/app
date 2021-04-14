import React from "react"
import { Image, ViewStyle, TextStyle, ImageStyle } from "react-native"
import Modal, { ModalProps } from "react-native-modal"
import { Button, Text } from "../../../components"
import { color, spacing } from "../../../theme"

const warningIcon = require("../../../../assets/warning.png")

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "25%",
  maxHeight: 400,
  padding: spacing[5],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: 8,
}

const MODAL_ICON: ImageStyle = {
  width: 75,
  height: 65,
  marginBottom: spacing[3],
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
  width: "80%",
}

export interface RouteListModalProps extends ModalProps {
  onOk: () => void
}

export const RouteListModal = function RouteListModal({ onOk, ...rest }: RouteListModalProps) {
  return (
    <Modal style={MODAL_WRAPPER} {...rest}>
      <Image style={MODAL_ICON} source={warningIcon} />
      <Text style={MODAL_TITLE}>לא נמצאו רכבות לתאריך המבוקש</Text>
      <Text style={MODAL_TEXT}>קיימות רכבות עוקבות החל מיום ראשון 18/04/21</Text>
      <Button title="אישור" style={MODAL_BUTTON} onPress={onOk} />
    </Modal>
  )
}
