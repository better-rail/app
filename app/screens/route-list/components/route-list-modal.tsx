import React from "react"
import { ViewStyle, TextStyle } from "react-native"
import Modal, { ModalProps } from "react-native-modal"
import { Button, Text } from "../../../components"
import { format } from "date-fns"
import { dateFnsLocalization, translate } from "../../../i18n"
import { color, spacing } from "../../../theme"

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
  marginBottom: spacing[4],
  textAlign: "center",
  fontSize: 18,
}

const MODAL_BUTTON: ViewStyle = {
  minWidth: "80%",
}

export interface RouteListModalProps extends ModalProps {
  routesDate: number
  onOk: () => void
}

export const RouteListModal = function RouteListModal({ routesDate, onOk, ...rest }: RouteListModalProps) {
  const formattedRoutesDate = format(routesDate, "eeee, dd/MM/yyyy", { locale: dateFnsLocalization })

  return (
    <Modal style={MODAL_WRAPPER} animationIn="zoomIn" animationOut="zoomOut" {...rest}>
      <Text style={MODAL_ICON}>⚠️</Text>
      <Text style={MODAL_TITLE} tx="modals.noTrainsFound" />
      <Text style={MODAL_TEXT}>
        {translate("modals.foundTrainsAt")}
        {formattedRoutesDate}
      </Text>
      <Button title={translate("common.ok")} style={MODAL_BUTTON} onPress={() => onOk()} />
    </Modal>
  )
}
