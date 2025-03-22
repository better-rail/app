import "react-native-modalfy"

interface ModalStackParams {
  RouteListWarningModal: {
    warningType: "different-hour" | "different-date"
    formattedRoutesDate: string
    onClose: () => void
  }
}

declare module "react-native-modalfy" {
  interface ModalfyCustomParams extends ModalStackParams {}
}
