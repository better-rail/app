import "react-native-modalfy"

interface ModalStackParams {
  RouteListWarningModal: {
    warningType: "different-hour" | "different-date"
    formattedRoutesDate: string
    onClose: () => void
  }
  DatePickerModal: {
    onConfirm: (date: Date) => void
    minimumDate?: Date
  }
  TipThanksModal: Record<string, never>
}

declare module "react-native-modalfy" {
  interface ModalfyCustomParams extends ModalStackParams {}
}
