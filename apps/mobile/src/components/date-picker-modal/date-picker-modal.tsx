import { Platform } from "react-native"
import { DatePickerModal as DatePickerModalAndroid } from "./date-picker-modal.android"
import { DatePickerModal as DatePickerModalIOS } from "./date-picker-modal.ios"

export const DatePickerModal = Platform.select({
  ios: DatePickerModalIOS,
  android: DatePickerModalAndroid,
}) as typeof DatePickerModalIOS

export type { DatePickerModalProps } from "./date-picker-modal.ios"
