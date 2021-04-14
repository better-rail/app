import React from "react"
import Modal, { ModalProps } from "react-native-modal"

export interface RouteListModalProps extends ModalProps {}

const RouteListModal = function RouteListModal({ ...rest }: RouteListModalProps) {
  return <Modal {...rest}></Modal>
}
